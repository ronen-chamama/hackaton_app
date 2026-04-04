"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import ExcelJS from "exceljs";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export type AssignmentRole = "user" | "admin" | "absent";
export type AssignmentSource = "user";

export interface AssignmentPayload {
  target: "pool" | "admin" | "group" | "absent";
  groupId?: string | null;
}

function parseRosterCsv(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return {
      ok: true as const,
      rows: [] as Array<{ email: string; name: string; home_group: string }>,
    };
  }

  const sanitizeHeader = (value: string) => value.trim().toLowerCase();
  const headers = lines[0].split(",").map(sanitizeHeader);
  const nameIndex = headers.indexOf("name");
  const emailIndex = headers.indexOf("email");
  const homeGroupIndex = headers.indexOf("home_group");

  if (nameIndex < 0 || emailIndex < 0 || homeGroupIndex < 0) {
    return { ok: false as const, error: "CSV headers must be: name,email,home_group" };
  }

  const rows = lines
    .slice(1)
    .map((line) => line.split(",").map((cell) => cell.trim()))
    .map((cells) => ({
      name: cells[nameIndex] ?? "",
      email: (cells[emailIndex] ?? "").toLowerCase(),
      home_group: cells[homeGroupIndex] ?? "",
    }))
    .filter((row) => row.email);

  return { ok: true as const, rows };
}

async function getAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: adminUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (adminUser?.role !== "admin" && adminUser?.role !== "super-admin") {
    redirect("/");
  }

  return supabase;
}

async function getActiveHackathonId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: activeHackathon } = await supabase
    .from("hackathons")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return (activeHackathon?.id as string | undefined) ?? null;
}

export async function importRosterCsv(formData: FormData) {
  const supabase = await getAdminClient();

  const file = formData.get("csv");
  if (!(file instanceof File)) {
    return;
  }

  const csvText = await file.text();
  const parsed = parseRosterCsv(csvText);
  if (!parsed.ok) {
    return { ok: false as const, error: parsed.error };
  }
  const rows = parsed.rows;

  const normalizedEmails = rows.map((row) => row.email.toLowerCase());
  const { data: existingRows, error: existingRowsError } = await supabase
    .from("users")
    .select("id, email, role, group_id")
    .in("email", normalizedEmails);

  if (existingRowsError) {
    return { ok: false as const, error: existingRowsError.message };
  }

  const existingByEmail = new Map<string, Record<string, unknown>>();
  for (const row of (existingRows ?? []) as Record<string, unknown>[]) {
    const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    if (!email) continue;
    existingByEmail.set(email, row);
  }

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    if (!email) {
      continue;
    }

    const existing = existingByEmail.get(email);
    const existingRole = typeof existing?.role === "string" ? existing.role : "";
    const existingGroupId =
      typeof existing?.group_id === "string" ? existing.group_id : null;
    const existingId = typeof existing?.id === "string" ? existing.id : crypto.randomUUID();

    const payload: Record<string, unknown> = {
      id: existingId,
      email,
      name: row.name,
      home_group: row.home_group || null,
      role: existingRole === "admin" || existingRole === "super-admin" ? existingRole : "user",
      group_id: existingGroupId,
    };

    const { error: upsertError } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "email" });

    if (upsertError) {
      console.error("CSV users upsert failed", { email, error: upsertError });
      return { ok: false as const, error: upsertError.message };
    }
  }

  revalidatePath("/admin/groups");
  return { ok: true as const, count: rows.length };
}

export async function createHackathonGroup(groupPrefix?: string) {
  const supabase = await getAdminClient();

  const { count } = await supabase
    .from("groups")
    .select("id", { count: "exact", head: true });

  const safePrefix = groupPrefix?.trim() || t("groupPrefix");
  const nextName = `${safePrefix} ${(count ?? 0) + 1}`;

  const { data, error } = await supabase
    .from("groups")
    .insert({
      name: nextName,
    })
    .select("id, name")
    .single();

  let createdData = data as Record<string, unknown> | null;
  if (error || !createdData) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("groups")
      .insert({
        name: nextName,
      })
      .select("id, name")
      .single();

    if (fallbackError || !fallbackData) {
      throw fallbackError ?? error ?? new Error("Failed to create group");
    }

    createdData = fallbackData as Record<string, unknown>;
  }

  revalidatePath("/admin/groups");

  const row = createdData as Record<string, unknown>;
  return {
    id: String(row.id),
    name: (typeof row.name === "string" && row.name) || nextName,
  };
}

export async function updateStudentAssignment(
  _source: AssignmentSource,
  identifier: { email: string; id?: string | null },
  payload: AssignmentPayload
) {
  const supabase = await getAdminClient();
  let newRole: AssignmentRole = "user";
  let newGroupId: string | null = null;

  if (payload.target === "admin") {
    newRole = "admin";
  } else if (payload.target === "absent") {
    newRole = "absent";
  } else if (payload.target === "group" && payload.groupId) {
    newGroupId = payload.groupId;
  }

  const email = identifier.email.trim().toLowerCase();
  if (!email) {
    return { ok: false as const, error: "Missing email identifier" };
  }

  let updateQuery = supabase
    .from("users")
    .update({ role: newRole, group_id: newGroupId })
    .ilike("email", email);

  if (identifier.id) {
    updateQuery = updateQuery.eq("id", identifier.id);
  }

  const { error } = await updateQuery;
  if (error) {
    console.error("Supabase Update Error:", error);
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/admin/groups");
  return { ok: true as const };
}

export async function updateUserAssignment(userId: string, payload: AssignmentPayload) {
  const supabase = await getAdminClient();
  const { data: userRow, error: userLookupError } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (userLookupError) {
    console.error("Supabase Update Error:", userLookupError);
    return { ok: false as const, error: userLookupError.message };
  }

  const userEmail = (userRow as Record<string, unknown> | null)?.email;
  if (typeof userEmail !== "string" || !userEmail.trim()) {
    return { ok: false as const, error: "User email not found for assignment" };
  }

  return updateStudentAssignment("user", { id: userId, email: userEmail }, payload);
}

export async function deleteHackathonGroup(groupId: string) {
  const supabase = await getAdminClient();

  const { error: usersError } = await supabase
    .from("users")
    .update({ group_id: null })
    .eq("group_id", groupId);

  if (usersError) {
    console.error("deleteHackathonGroup users unassign failed", { groupId, error: usersError });
    throw usersError;
  }

  const { error: deleteError } = await supabase.from("groups").delete().eq("id", groupId);

  if (deleteError) {
    console.error("deleteHackathonGroup delete failed", { groupId, error: deleteError });
    throw deleteError;
  }

  revalidatePath("/admin/groups");
}

export async function exportUsersCsvData() {
  const supabase = await getAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("name, email, home_group, group_id")
    .neq("role", "admin")
    .neq("role", "super-admin")
    .order("name");

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const rows = (data ?? []).map((row) => {
    const item = row as Record<string, unknown>;
    return {
      name: typeof item.name === "string" ? item.name : "",
      email: typeof item.email === "string" ? item.email : "",
      home_group: typeof item.home_group === "string" ? item.home_group : "",
      group_id: typeof item.group_id === "string" ? item.group_id : "",
    };
  });

  return { ok: true as const, rows };
}

export async function exportGroupsForPrintData() {
  const supabase = await getAdminClient();
  const activeHackathonId = await getActiveHackathonId(supabase);

  let hackathonRow: Record<string, unknown> | null = null;
  if (activeHackathonId) {
    const { data } = await supabase
      .from("hackathons")
      .select("title")
      .eq("id", activeHackathonId)
      .maybeSingle();
    hackathonRow = (data as Record<string, unknown> | null) ?? null;
  }

  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("id, name")
    .order("name");

  if (groupsError) {
    return { ok: false as const, error: groupsError.message };
  }

  const groupIds = (groups ?? []).map((group) => String((group as Record<string, unknown>).id));

  const { data: users } = groupIds.length
    ? await supabase.from("users").select("name, group_id").in("group_id", groupIds)
    : { data: [] as unknown[] };

  const membersByGroup = new Map<string, string[]>();

  for (const row of (users ?? []) as Record<string, unknown>[]) {
    const gid = typeof row.group_id === "string" ? row.group_id : null;
    if (!gid) continue;
    const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : "";
    if (!name) continue;
    const bucket = membersByGroup.get(gid) ?? [];
    bucket.push(name);
    membersByGroup.set(gid, bucket);
  }

  const printableGroups = (groups ?? []).map((group) => {
    const row = group as Record<string, unknown>;
    const groupId = String(row.id);
    const groupName = (typeof row.name === "string" && row.name) || groupId;
    return {
      id: groupId,
      name: groupName,
      members: membersByGroup.get(groupId) ?? [],
    };
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Groups");

  sheet.views = [{ rightToLeft: true }];
  sheet.columns = [
    { width: 25 },
    { width: 3 },
    { width: 3 },
    { width: 25 },
    { width: 3 },
    { width: 3 },
    { width: 25 },
  ];

  const hackathonTitle =
    hackathonRow?.title &&
    typeof hackathonRow.title === "string"
      ? String(hackathonRow.title)
      : "";

  sheet.mergeCells("A1:G2");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `${t("groups")} - ${hackathonTitle}`.trim();
  titleCell.font = { size: 22, bold: true };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  const cardStartColumns = [1, 4, 7];
  let currentRow = 4;

  for (let index = 0; index < printableGroups.length; index += 3) {
    const chunk = printableGroups.slice(index, index + 3);
    const maxMembersInChunk = Math.max(
      1,
      ...chunk.map((group) => group.members.length)
    );

    chunk.forEach((group, chunkIndex) => {
      const startCol = cardStartColumns[chunkIndex];
      const headerCell = sheet.getCell(currentRow, startCol);

      headerCell.value = group.name;
      headerCell.font = { bold: true, size: 14 };
      headerCell.alignment = { horizontal: "center", vertical: "middle" };
      headerCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF5F5F5" },
      };
      headerCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" },
      };

      for (let memberRowOffset = 0; memberRowOffset < maxMembersInChunk; memberRowOffset += 1) {
        const memberCell = sheet.getCell(currentRow + 1 + memberRowOffset, startCol);
        const memberName = group.members[memberRowOffset];
        memberCell.value = memberName ?? (group.members.length === 0 && memberRowOffset === 0 ? "-" : "");
        memberCell.alignment = { horizontal: "center", vertical: "middle" };
        memberCell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
          bottom: { style: "thin" },
        };
      }
    });

    currentRow += maxMembersInChunk + 3;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileBase64 = Buffer.from(buffer).toString("base64");

  return {
    ok: true as const,
    fileBase64,
    filename: "hackathon_groups.xlsx",
  };
}

export async function resetRosterData() {
  const supabase = await getAdminClient();

  const { error: clearGroupIdsError } = await supabase
    .from("users")
    .update({ group_id: null })
    .not("group_id", "is", null);

  if (clearGroupIdsError) {
    return { ok: false as const, error: clearGroupIdsError.message };
  }

  const { error: rolesError } = await supabase
    .from("users")
    .update({ role: "user" })
    .neq("role", "admin")
    .neq("role", "super-admin");

  if (rolesError) {
    return { ok: false as const, error: rolesError.message };
  }

  const { error: deleteGroupsError } = await supabase
    .from("groups")
    .delete()
    .not("id", "is", null);

  if (deleteGroupsError) {
    return { ok: false as const, error: deleteGroupsError.message };
  }

  revalidatePath("/admin/groups");
  return { ok: true as const };
}

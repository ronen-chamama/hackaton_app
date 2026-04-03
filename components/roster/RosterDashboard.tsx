"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { t } from "@/lib/i18n";
import {
  exportGroupsForPrintData,
  exportStudentInvitesCsvData,
  importRosterCsv,
  resetRosterData,
  createHackathonGroup,
  deleteHackathonGroup,
  updateInviteAssignment,
  updateUserAssignment,
  type AssignmentPayload,
} from "@/lib/actions/roster";

type RosterUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  group_id: string | null;
  home_group?: string | null;
};

type RosterInvite = {
  email: string;
  name: string;
  role?: string | null;
  group_id: string | null;
  home_group?: string | null;
};

type HackathonGroup = {
  id: string;
  name: string;
};

type DragMeta =
  | { kind: "user"; id: string }
  | { kind: "invite"; email: string };

interface RosterDashboardProps {
  initialGroups: HackathonGroup[];
  initialUsers: RosterUser[];
  initialInvites: RosterInvite[];
  activeHackathonId: string | null;
}

function normalizeHomeGroup(value: string | null | undefined): string {
  return value?.trim() || "-";
}

function compactLabel(name: string, homeGroup: string | null | undefined): string {
  const left = name.trim() || "-";
  const right = homeGroup?.trim();
  return right ? `${left} | ${right}` : left;
}

function dropTargetFromId(overId: string | null): AssignmentPayload {
  if (!overId) {
    return { target: "pool" };
  }
  if (overId === "zone:admin") {
    return { target: "admin" };
  }
  if (overId === "zone:absent") {
    return { target: "absent" };
  }
  if (overId === "zone:pool") {
    return { target: "pool" };
  }
  if (overId.startsWith("group:")) {
    return { target: "group", groupId: overId.replace("group:", "") };
  }
  return { target: "pool" };
}

function assignmentForLocalState(target: AssignmentPayload): {
  role: string;
  group_id: string | null;
} {
  if (target.target === "admin") {
    return { role: "admin", group_id: null };
  }
  if (target.target === "absent") {
    return { role: "absent", group_id: null };
  }
  if (target.target === "group" && target.groupId) {
    return { role: "user", group_id: target.groupId };
  }
  return { role: "user", group_id: null };
}

function DraggablePersonCard({
  dragMeta,
  label,
  dimmed,
}: {
  dragMeta: DragMeta;
  label: string;
  dimmed?: boolean;
}) {
  const dragId = dragMeta.kind === "user" ? `user:${dragMeta.id}` : `invite:${dragMeta.email}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: dragMeta,
  });

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`cursor-grab rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-medium text-foreground shadow-sm ${
        isDragging ? "opacity-50" : ""
      } ${dimmed ? "opacity-80" : ""}`}
      style={
        transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            }
          : undefined
      }
    >
      {label}
    </article>
  );
}

function DroppableZone({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const zoneBaseClass =
    id === "zone:admin"
      ? "!bg-amber-50 !border-amber-300"
      : id === "zone:absent"
      ? "!bg-slate-100 !border-slate-300 opacity-90"
      : "bg-surface-raised border-border";

  return (
    <section
      ref={setNodeRef}
      className={`rounded-xl border p-3 ${zoneBaseClass} ${
        isOver ? "!border-primary" : ""
      } ${className ?? ""}`}
    >
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

function PoolSidebar({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "zone:pool" });

  return (
    <aside
      ref={setNodeRef}
      className={`w-72 flex flex-col min-h-[600px] border rounded-xl bg-gray-50 p-3 ${
        isOver ? "border-primary" : "border-border"
      }`}
    >
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-2 space-y-2">{children}</div>
    </aside>
  );
}

export function RosterDashboard({
  initialGroups,
  initialUsers,
  initialInvites,
  activeHackathonId,
}: RosterDashboardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [groups, setGroups] = useState(initialGroups);
  const [users, setUsers] = useState(initialUsers);
  const [invites, setInvites] = useState(initialInvites);
  const [activeDrag, setActiveDrag] = useState<DragMeta | null>(null);
  const [selectedHomeGroup, setSelectedHomeGroup] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const poolUsers = users.filter((user) => user.role !== "admin" && user.role !== "absent" && !user.group_id);
  const poolInvites = invites.filter(
    (invite) => (invite.role ?? "user") !== "admin" && (invite.role ?? "user") !== "absent" && !invite.group_id
  );

  const homeGroupOptions = useMemo(() => {
    const values = new Set<string>();
    for (const user of poolUsers) {
      const home = user.home_group?.trim();
      if (home) values.add(home);
    }
    for (const invite of poolInvites) {
      const home = invite.home_group?.trim();
      if (home) values.add(home);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [poolInvites, poolUsers]);

  const filteredPoolUsers = useMemo(() => {
    if (selectedHomeGroup === "all") {
      return poolUsers;
    }
    return poolUsers.filter((user) => normalizeHomeGroup(user.home_group) === selectedHomeGroup);
  }, [poolUsers, selectedHomeGroup]);

  const filteredPoolInvites = useMemo(() => {
    if (selectedHomeGroup === "all") {
      return poolInvites;
    }
    return poolInvites.filter(
      (invite) => normalizeHomeGroup(invite.home_group) === selectedHomeGroup
    );
  }, [poolInvites, selectedHomeGroup]);

  const groupedPool = useMemo(() => {
    const bucket = new Map<string, Array<{ kind: "user" | "invite"; key: string }>>();

    for (const user of filteredPoolUsers) {
      const home = normalizeHomeGroup(user.home_group);
      const list = bucket.get(home) ?? [];
      list.push({ kind: "user", key: user.id });
      bucket.set(home, list);
    }

    for (const invite of filteredPoolInvites) {
      const home = normalizeHomeGroup(invite.home_group);
      const list = bucket.get(home) ?? [];
      list.push({ kind: "invite", key: invite.email });
      bucket.set(home, list);
    }

    return Array.from(bucket.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredPoolInvites, filteredPoolUsers]);

  const adminUsers = users.filter((user) => user.role === "admin");
  const adminInvites = invites.filter((invite) => (invite.role ?? "user") === "admin");
  const absentUsers = users.filter((user) => user.role === "absent");
  const absentInvites = invites.filter((invite) => (invite.role ?? "user") === "absent");

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const inviteByEmail = useMemo(
    () => new Map(invites.map((invite) => [invite.email.toLowerCase(), invite])),
    [invites]
  );

  const mutateLocalAssignment = (meta: DragMeta, target: AssignmentPayload) => {
    const next = assignmentForLocalState(target);

    if (meta.kind === "user") {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === meta.id
            ? {
                ...user,
                role: next.role,
                group_id: next.group_id,
              }
            : user
        )
      );
      return;
    }

    setInvites((prev) =>
      prev.map((invite) =>
        invite.email.toLowerCase() === meta.email.toLowerCase()
          ? {
              ...invite,
              role: next.role,
              group_id: next.group_id,
            }
          : invite
      )
    );
  };

  const persistAssignment = async (meta: DragMeta, target: AssignmentPayload) => {
    if (meta.kind === "user") {
      const result = await updateUserAssignment(meta.id, target);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return;
    }

    const result = await updateInviteAssignment(meta.email, target);
    if (!result.ok) {
      throw new Error(result.error);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current as DragMeta | undefined;
    const target = dropTargetFromId(event.over?.id ? String(event.over.id) : null);

    setActiveDrag(null);

    if (!activeData) {
      return;
    }

    const previousUsers = users;
    const previousInvites = invites;

    mutateLocalAssignment(activeData, target);

    startTransition(() => {
      void persistAssignment(activeData, target).catch((error) => {
        console.error("Failed to update assignment:", error);
        setUsers(previousUsers);
        setInvites(previousInvites);
      });
    });
  };

  const handleCreateGroup = () => {
    startTransition(() => {
      void createHackathonGroup(t("groupPrefix"))
        .then((group) => {
          setGroups((prev) => [...prev, group]);
        })
        .catch((error) => {
          console.error("Failed to create group:", error);
        });
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    const isConfirmed = window.confirm(t("deleteGroupWarning"));
    if (!isConfirmed) {
      return;
    }

    startTransition(() => {
      void deleteHackathonGroup(groupId)
        .then(() => {
          setGroups((prev) => prev.filter((group) => group.id !== groupId));
          setUsers((prev) =>
            prev.map((user) => (user.group_id === groupId ? { ...user, group_id: null } : user))
          );
          setInvites((prev) =>
            prev.map((invite) =>
              invite.group_id === groupId ? { ...invite, group_id: null } : invite
            )
          );
        })
        .catch((error) => {
          console.error("Failed to delete group:", error);
        });
    });
  };

  const handleImportCsv = (file: File) => {
    startTransition(() => {
      const formData = new FormData();
      formData.append("csv", file);
      void importRosterCsv(formData)
        .then((result) => {
          if (!result?.ok) {
            window.alert(result?.error ?? "Import failed");
            return;
          }
          window.alert(`${t("importSuccess")}: ${result.count}`);
          window.location.reload();
        })
        .catch((error) => {
          console.error("Failed to import CSV:", error);
          window.alert("Import failed");
        });
    });
  };

  const handleExportCsv = () => {
    startTransition(() => {
      void exportStudentInvitesCsvData()
        .then((result) => {
          if (!result.ok) {
            window.alert(result.error ?? "Export failed");
            return;
          }

          const escapeCell = (value: string) => {
            const text = String(value ?? "");
            if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
              return `"${text.replace(/"/g, "\"\"")}"`;
            }
            return text;
          };

          const header = ["name", "email", "home_group", "group_id"];
          const lines = [
            header.join(","),
            ...result.rows.map((row) =>
              [row.name, row.email, row.home_group, row.group_id].map(escapeCell).join(",")
            ),
          ];

          const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = "student_invites.csv";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
        })
        .catch((error) => {
          console.error("Failed to export CSV:", error);
          window.alert("Export failed");
        });
    });
  };

  const handleExportPrintableGroups = () => {
    startTransition(() => {
      void exportGroupsForPrintData()
        .then(async (result) => {
          if (!result.ok) {
            window.alert(result.error ?? "Export failed");
            return;
          }

          const ExcelJS = await import("exceljs");
          const workbook = new ExcelJS.Workbook();
          const sheet = workbook.addWorksheet("Groups");

          sheet.views = [{ rightToLeft: true }];
          sheet.columns = [
            { width: 4 },
            { width: 42 },
            { width: 4 },
          ];

          sheet.getCell("B2").value = `${t("downloadGroups")} ${result.hackathonTitle}`.trim();
          sheet.getCell("B2").font = { size: 18, bold: true };
          sheet.getCell("B2").alignment = { horizontal: "center", vertical: "middle" };

          let rowCursor = 4;
          for (const group of result.groups) {
            const headerCell = sheet.getCell(`B${rowCursor}`);
            headerCell.value = group.name;
            headerCell.font = { bold: true, size: 14 };
            headerCell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
              bottom: { style: "thin" },
            };
            headerCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF5F5F5" },
            };

            rowCursor += 1;
            if (group.members.length === 0) {
              const emptyCell = sheet.getCell(`B${rowCursor}`);
              emptyCell.value = "-";
              emptyCell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
                bottom: { style: "thin" },
              };
              rowCursor += 1;
            } else {
              for (const member of group.members) {
                const memberCell = sheet.getCell(`B${rowCursor}`);
                memberCell.value = member;
                memberCell.border = {
                  top: { style: "thin" },
                  left: { style: "thin" },
                  right: { style: "thin" },
                  bottom: { style: "thin" },
                };
                rowCursor += 1;
              }
            }

            rowCursor += 1;
          }

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = "groups-for-print.xlsx";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
        })
        .catch((error) => {
          console.error("Failed to export groups workbook:", error);
          window.alert("Export failed");
        });
    });
  };

  const handleResetRoster = () => {
    const confirmed = window.confirm(t("startOverWarning"));
    if (!confirmed) {
      return;
    }

    startTransition(() => {
      void resetRosterData()
        .then((result) => {
          if (!result.ok) {
            window.alert(result.error ?? "Reset failed");
            return;
          }
          window.alert("Reset completed");
          window.location.reload();
        })
        .catch((error) => {
          console.error("Failed to reset roster:", error);
          window.alert("Reset failed");
        });
    });
  };

  if (!isMounted) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const data = event.active.data.current as DragMeta | undefined;
        setActiveDrag(data ?? null);
      }}
      onDragCancel={() => setActiveDrag(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-start gap-6" dir="rtl">
        <PoolSidebar title={t("unassigned")}>
            <div className="rounded-md border border-border bg-background p-2">
              <select
                value={selectedHomeGroup}
                onChange={(event) => setSelectedHomeGroup(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              >
                <option value="all">{t("all")}</option>
                {homeGroupOptions.map((homeGroup) => (
                  <option key={homeGroup} value={homeGroup}>
                    {homeGroup}
                  </option>
                ))}
              </select>
            </div>
            {groupedPool.map(([homeGroup, members]) => (
              <div key={homeGroup} className="space-y-1.5 rounded-md bg-background/70 p-2">
                <p className="text-[11px] font-semibold text-foreground/80">
                  {t("homeGroup")}: {homeGroup}
                </p>
                <div className="space-y-1.5">
                  {members.map((member) => {
                    if (member.kind === "user") {
                      const user = userById.get(member.key);
                      if (!user) return null;
                      return (
                        <DraggablePersonCard
                          key={`pool-u:${user.id}`}
                          dragMeta={{ kind: "user", id: user.id }}
                          label={compactLabel(user.name || user.email, user.home_group)}
                        />
                      );
                    }

                    const invite = inviteByEmail.get(member.key.toLowerCase());
                    if (!invite) return null;
                    return (
                      <DraggablePersonCard
                        key={`pool-i:${invite.email}`}
                        dragMeta={{ kind: "invite", email: invite.email }}
                        label={compactLabel(invite.name || invite.email, invite.home_group)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
        </PoolSidebar>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (!file) {
                    return;
                  }
                  handleImportCsv(file);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger"
                onClick={handleResetRoster}
                disabled={isPending}
              >
                {t("startOver")}
              </button>
              <button
                type="button"
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium"
                onClick={() => importInputRef.current?.click()}
                disabled={isPending}
              >
                {t("uploadCsv")}
              </button>
              <button
                type="button"
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium"
                onClick={handleExportCsv}
                disabled={isPending}
              >
                {t("downloadCsv")}
              </button>
              <button
                type="button"
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium"
                onClick={handleExportPrintableGroups}
                disabled={isPending}
              >
                {t("downloadGroups")}
              </button>
              <button
                type="button"
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium"
                onClick={handleCreateGroup}
                disabled={isPending}
              >
                {t("createNewGroup")}
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <DroppableZone
                key={group.id}
                id={`group:${group.id}`}
                title={
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={
                        activeHackathonId
                          ? `/?group=${group.id}&preview=${activeHackathonId}`
                          : `/?group=${group.id}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-md px-1 text-sm font-semibold text-foreground transition-colors hover:bg-surface hover:text-primary"
                    >
                      <span className="truncate">{group.name}</span>
                    </a>
                    <button
                      type="button"
                      className="rounded-md border border-danger/40 bg-danger/10 px-2 py-1 text-[11px] font-medium text-danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteGroup(group.id);
                      }}
                      disabled={isPending}
                    >
                      {t("delete")}
                    </button>
                  </div>
                }
              >
                {users
                  .filter((user) => user.group_id === group.id)
                  .map((user) => (
                    <DraggablePersonCard
                      key={`u:${user.id}`}
                      dragMeta={{ kind: "user", id: user.id }}
                      label={compactLabel(user.name || user.email, user.home_group)}
                    />
                  ))}

                {invites
                  .filter((invite) => invite.group_id === group.id)
                  .map((invite) => (
                    <DraggablePersonCard
                      key={`i:${invite.email}`}
                      dragMeta={{ kind: "invite", email: invite.email }}
                      label={compactLabel(invite.name || invite.email, invite.home_group)}
                    />
                  ))}
              </DroppableZone>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <DroppableZone id="zone:admin" title={t("admins")}>
              {adminUsers.map((user) => (
                <DraggablePersonCard
                  key={`admin-u:${user.id}`}
                  dragMeta={{ kind: "user", id: user.id }}
                  label={compactLabel(user.name || user.email, user.home_group)}
                />
              ))}
              {adminInvites.map((invite) => (
                <DraggablePersonCard
                  key={`admin-i:${invite.email}`}
                  dragMeta={{ kind: "invite", email: invite.email }}
                  label={compactLabel(invite.name || invite.email, invite.home_group)}
                />
              ))}
            </DroppableZone>

            <DroppableZone id="zone:absent" title={t("absent")}>
              {absentUsers.map((user) => (
                <DraggablePersonCard
                  key={`absent-u:${user.id}`}
                  dragMeta={{ kind: "user", id: user.id }}
                  label={compactLabel(user.name || user.email, user.home_group)}
                />
              ))}
              {absentInvites.map((invite) => (
                <DraggablePersonCard
                  key={`absent-i:${invite.email}`}
                  dragMeta={{ kind: "invite", email: invite.email }}
                  label={compactLabel(invite.name || invite.email, invite.home_group)}
                />
              ))}
            </DroppableZone>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDrag?.kind === "user" ? (
          <DraggablePersonCard
            dragMeta={activeDrag}
            label={compactLabel(
              userById.get(activeDrag.id)?.name || userById.get(activeDrag.id)?.email || "",
              userById.get(activeDrag.id)?.home_group
            )}
            dimmed
          />
        ) : activeDrag?.kind === "invite" ? (
          <DraggablePersonCard
            dragMeta={activeDrag}
            label={compactLabel(
              inviteByEmail.get(activeDrag.email.toLowerCase())?.name ||
                inviteByEmail.get(activeDrag.email.toLowerCase())?.email ||
                "",
              inviteByEmail.get(activeDrag.email.toLowerCase())?.home_group
            )}
            dimmed
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

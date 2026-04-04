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
  exportUsersCsvData,
  importRosterCsv,
  resetRosterData,
  createHackathonGroup,
  deleteHackathonGroup,
  updateStudentAssignment,
  type AssignmentPayload,
  type AssignmentSource,
} from "@/lib/actions/roster";

type RosterStudent = {
  source: AssignmentSource;
  id?: string;
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

type DragMeta = {
  kind: "student";
  source: AssignmentSource;
  id?: string;
  email: string;
  key: string;
};

interface RosterDashboardProps {
  initialGroups: HackathonGroup[];
  initialStudents: RosterStudent[];
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

function studentKey(student: RosterStudent): string {
  const identifier = student.id?.trim() || student.email.trim().toLowerCase();
  return `${student.source}:${identifier}`;
}

function roleOf(student: RosterStudent): string {
  return student.role ?? "user";
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
  source,
  dimmed,
}: {
  dragMeta: DragMeta;
  label: string;
  source: AssignmentSource;
  dimmed?: boolean;
}) {
  const dragId = `student:${dragMeta.key}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: dragMeta,
  });

  const sourceDotClass =
    source === "user" ? "bg-emerald-500" : "border border-slate-400 bg-transparent";

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
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${sourceDotClass}`} />
        <span>{label}</span>
      </div>
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
  initialStudents,
  activeHackathonId,
}: RosterDashboardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [groups, setGroups] = useState(initialGroups);
  const [students, setStudents] = useState(initialStudents);
  const [activeDrag, setActiveDrag] = useState<DragMeta | null>(null);
  const [selectedHomeGroup, setSelectedHomeGroup] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const poolStudents = useMemo(
    () =>
      students.filter((student) => {
        const role = roleOf(student);
        return role !== "admin" && role !== "super-admin" && role !== "absent" && !student.group_id;
      }),
    [students]
  );

  const homeGroupOptions = useMemo(() => {
    const values = new Set<string>();
    for (const student of poolStudents) {
      const home = student.home_group?.trim();
      if (home) values.add(home);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [poolStudents]);

  const filteredPoolStudents = useMemo(() => {
    if (selectedHomeGroup === "all") {
      return poolStudents;
    }
    return poolStudents.filter(
      (student) => normalizeHomeGroup(student.home_group) === selectedHomeGroup
    );
  }, [poolStudents, selectedHomeGroup]);

  const groupedPool = useMemo(() => {
    const bucket = new Map<string, string[]>();

    for (const student of filteredPoolStudents) {
      const home = normalizeHomeGroup(student.home_group);
      const list = bucket.get(home) ?? [];
      list.push(studentKey(student));
      bucket.set(home, list);
    }

    return Array.from(bucket.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredPoolStudents]);

  const adminStudents = students.filter((student) => roleOf(student) === "admin");
  const absentStudents = students.filter((student) => roleOf(student) === "absent");

  const studentsByKey = useMemo(
    () => new Map(students.map((student) => [studentKey(student), student])),
    [students]
  );

  const mutateLocalAssignment = (meta: DragMeta, target: AssignmentPayload) => {
    const next = assignmentForLocalState(target);
    setStudents((prev) =>
      prev.map((student) => {
        if (studentKey(student) !== meta.key) {
          return student;
        }
        return {
          ...student,
          role: next.role,
          group_id: next.group_id,
        };
      })
    );
  };

  const persistAssignment = async (meta: DragMeta, target: AssignmentPayload) => {
    const result = await updateStudentAssignment(
      meta.source,
      { id: meta.id ?? null, email: meta.email },
      target
    );
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

    const previousStudents = students;
    mutateLocalAssignment(activeData, target);

    startTransition(() => {
      void persistAssignment(activeData, target).catch((error) => {
        console.error("Failed to update assignment:", error);
        setStudents(previousStudents);
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
          setStudents((prev) =>
            prev.map((student) =>
              student.group_id === groupId ? { ...student, group_id: null } : student
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
      void exportUsersCsvData()
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
          anchor.download = "users.csv";
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
        .then((result) => {
          if (!result.ok) {
            window.alert(result.error ?? "Export failed");
            return;
          }
          if (!result.fileBase64) {
            window.alert("Export failed");
            return;
          }

          const byteCharacters = atob(result.fileBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let index = 0; index < byteCharacters.length; index += 1) {
            byteNumbers[index] = byteCharacters.charCodeAt(index);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = result.filename || "hackathon_groups.xlsx";
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
          {groupedPool.map(([homeGroup, memberKeys]) => (
            <div key={homeGroup} className="space-y-1.5 rounded-md bg-background/70 p-2">
              <p className="text-[11px] font-semibold text-foreground/80">
                {t("homeGroup")}: {homeGroup}
              </p>
              <div className="space-y-1.5">
                {memberKeys.map((key) => {
                  const student = studentsByKey.get(key);
                  if (!student) return null;
                  return (
                    <DraggablePersonCard
                      key={`pool:${key}`}
                      source={student.source}
                      dragMeta={{
                        kind: "student",
                        source: student.source,
                        id: student.id,
                        email: student.email,
                        key,
                      }}
                      label={compactLabel(student.name || student.email, student.home_group)}
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
                {students
                  .filter((student) => student.group_id === group.id)
                  .map((student) => {
                    const key = studentKey(student);
                    return (
                      <DraggablePersonCard
                        key={`group:${key}`}
                        source={student.source}
                        dragMeta={{
                          kind: "student",
                          source: student.source,
                          id: student.id,
                          email: student.email,
                          key,
                        }}
                        label={compactLabel(student.name || student.email, student.home_group)}
                      />
                    );
                  })}
              </DroppableZone>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <DroppableZone id="zone:admin" title={t("admins")}>
              {adminStudents.map((student) => {
                const key = studentKey(student);
                return (
                  <DraggablePersonCard
                    key={`admin:${key}`}
                    source={student.source}
                    dragMeta={{
                      kind: "student",
                      source: student.source,
                      id: student.id,
                      email: student.email,
                      key,
                    }}
                    label={compactLabel(student.name || student.email, student.home_group)}
                  />
                );
              })}
            </DroppableZone>

            <DroppableZone id="zone:absent" title={t("absent")}>
              {absentStudents.map((student) => {
                const key = studentKey(student);
                return (
                  <DraggablePersonCard
                    key={`absent:${key}`}
                    source={student.source}
                    dragMeta={{
                      kind: "student",
                      source: student.source,
                      id: student.id,
                      email: student.email,
                      key,
                    }}
                    label={compactLabel(student.name || student.email, student.home_group)}
                  />
                );
              })}
            </DroppableZone>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDrag ? (
          (() => {
            const student = studentsByKey.get(activeDrag.key);
            if (!student) {
              return null;
            }

            return (
              <DraggablePersonCard
                dragMeta={activeDrag}
                source={student.source}
                label={compactLabel(student.name || student.email, student.home_group)}
                dimmed
              />
            );
          })()
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

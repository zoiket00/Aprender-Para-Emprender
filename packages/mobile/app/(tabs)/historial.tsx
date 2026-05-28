import { useState } from "react";
import {
  View, Text, FlatList, SectionList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAsistenciaFechas, useAsistencia, useEliminarDia,
} from "@/hooks/useAsistencia";
import { Spinner } from "@/components/ui";
import { colors, spacing, fontSize, radius } from "@/theme";

interface Sesion { fecha: string; dia: string }
interface RegistroDetalle {
  nombre_completo: string;
  nombre_madre: string;
  fase: string;
  asistencia: string;
  nota: string;
}

function groupByMonth(items: Sesion[]): { title: string; data: Sesion[] }[] {
  const map = new Map<string, Sesion[]>();
  for (const item of items) {
    const parts = item.fecha.split("-");
    const key = `${parts[0]}-${parts[1]}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()].map(([key, data]) => {
    const parts = key.split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    return {
      title: d.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
      data,
    };
  });
}

function fmtFechaCorta(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
}

const BADGE_COLOR: Record<string, string> = {
  "Sí":          colors.success,
  "Justificado": colors.warning,
  "No":          colors.slate400,
};
const BADGE_BG: Record<string, string> = {
  "Sí":          colors.successLight,
  "Justificado": colors.warningLight,
  "No":          colors.slate50,
};
const BADGE_LABEL: Record<string, string> = {
  "Sí":          "✅ Presente",
  "Justificado": "📋 Justificado",
  "No":          "❌ Ausente",
};

export default function Historial() {
  const [selected, setSelected] = useState<Sesion | null>(null);

  const { data: fechas, isLoading: loadFechas } = useAsistenciaFechas();
  const filtros: Record<string, string> = selected ? { fecha: selected.fecha, dia: selected.dia } : {};
  const { data: rawRegistros, isLoading: loadDetalle } = useAsistencia(filtros);
  const eliminar = useEliminarDia();

  const registros = rawRegistros as RegistroDetalle[] | undefined;
  const sections  = groupByMonth(fechas ?? []);
  const presentes = registros?.filter((r) => r.asistencia === "Sí").length ?? 0;
  const total     = registros?.length ?? 0;
  const tasa      = total > 0 ? Math.round((presentes / total) * 100) : 0;

  // ── Vista detalle ──────────────────────────────────────────────────────────
  if (selected) {
    return (
      <SafeAreaView style={styles.safe}>
        {/* Header detalle */}
        <View style={styles.detalleHeader}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.detalleInfo}>
            <Text style={styles.detalleTitle}>{selected.dia}</Text>
            <Text style={styles.detalleSubtitle} numberOfLines={1}>{fmtFechaCorta(selected.fecha)}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() =>
              Alert.alert(
                "Eliminar sesión",
                `¿Eliminar la sesión del ${selected.dia} — ${fmtFechaCorta(selected.fecha)}? Esta acción no se puede deshacer.`,
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                      await eliminar.mutateAsync({ fecha: selected.fecha, dia: selected.dia });
                      setSelected(null);
                    },
                  },
                ]
              )
            }
          >
            {eliminar.isPending
              ? <ActivityIndicator size="small" color={colors.danger} />
              : <Text style={styles.deleteBtnText}>🗑</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Stats strip */}
        {!loadDetalle && total > 0 && (
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.success }]}>{presentes}</Text>
              <Text style={styles.statLbl}>Presentes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.danger }]}>{total - presentes}</Text>
              <Text style={styles.statLbl}>Ausentes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.brand }]}>{tasa}%</Text>
              <Text style={styles.statLbl}>Tasa</Text>
            </View>
          </View>
        )}

        {/* Lista registros */}
        {loadDetalle ? (
          <Spinner fullScreen />
        ) : total === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>Sin registros en esta sesión</Text>
          </View>
        ) : (
          <FlatList
            data={registros}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const color  = BADGE_COLOR[item.asistencia] ?? colors.slate400;
              const bgCol  = BADGE_BG[item.asistencia]   ?? colors.slate50;
              const label  = BADGE_LABEL[item.asistencia] ?? "❌ Ausente";
              return (
                <View style={[styles.row, { borderColor: color + "33" }]}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowNombre}>{item.nombre_completo}</Text>
                    <Text style={styles.rowSub}>{item.nombre_madre} · {item.fase}</Text>
                    {item.nota ? <Text style={styles.rowNota}>{item.nota}</Text> : null}
                  </View>
                  <View style={[styles.badge, { backgroundColor: bgCol, borderColor: color + "55" }]}>
                    <Text style={[styles.badgeText, { color }]}>{label}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Vista lista ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.listHeader}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>
          {loadFechas ? "Cargando…" : `${fechas?.length ?? 0} sesiones guardadas`}
        </Text>
      </View>

      {loadFechas ? (
        <Spinner fullScreen />
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={styles.emptyText}>Sin sesiones registradas aún</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => `${item.fecha}-${item.dia}-${i}`}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelected(item)}
              style={styles.sesionItem}
            >
              <View style={styles.sesionInfo}>
                <Text style={styles.sesionDia}>{item.dia}</Text>
                <Text style={styles.sesionFecha} numberOfLines={1}>
                  {fmtFechaCorta(item.fecha)}
                </Text>
              </View>
              <Text style={styles.sesionChevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.bg },

  // Lista
  listHeader:      { padding: spacing["2xl"], borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  title:           { fontSize: fontSize["2xl"], fontWeight: "700", color: colors.text },
  subtitle:        { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  sectionHeader:   { backgroundColor: colors.slate50, paddingHorizontal: spacing.lg, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionTitle:    { fontSize: 10, fontWeight: "700", color: colors.slate400, letterSpacing: 0.8 },
  sesionItem:      { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.slate50 },
  sesionInfo:      { flex: 1 },
  sesionDia:       { fontSize: fontSize.base, fontWeight: "600", color: colors.text },
  sesionFecha:     { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, textTransform: "capitalize" },
  sesionChevron:   { fontSize: 20, color: colors.slate400, marginLeft: spacing.sm },

  // Detalle header
  detalleHeader:   { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:         { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.slate100, alignItems: "center", justifyContent: "center" },
  backArrow:       { fontSize: 22, color: colors.text, lineHeight: 26 },
  detalleInfo:     { flex: 1 },
  detalleTitle:    { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
  detalleSubtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1, textTransform: "capitalize" },
  deleteBtn:       { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.dangerLight ?? "#FEE2E2", alignItems: "center", justifyContent: "center" },
  deleteBtnText:   { fontSize: 16 },

  // Stats strip
  statsStrip:      { flexDirection: "row", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.md },
  statItem:        { flex: 1, alignItems: "center" },
  statNum:         { fontSize: fontSize.xl, fontWeight: "700" },
  statLbl:         { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  statDivider:     { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  // Shared
  list:            { padding: spacing.lg, gap: spacing.sm },
  empty:           { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyEmoji:      { fontSize: 48, marginBottom: spacing.lg },
  emptyText:       { fontSize: fontSize.base, color: colors.textMuted },

  // Filas detalle
  row:             { flexDirection: "row", alignItems: "center", padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1 },
  rowInfo:         { flex: 1 },
  rowNombre:       { fontSize: fontSize.base, fontWeight: "600", color: colors.text },
  rowSub:          { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  rowNota:         { fontSize: fontSize.xs, color: colors.brand, marginTop: 4, fontStyle: "italic" },
  badge:           { borderRadius: radius.full, borderWidth: 1, paddingVertical: 4, paddingHorizontal: spacing.md },
  badgeText:       { fontSize: fontSize.xs, fontWeight: "600" },
});

import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAsistencia } from "@/hooks/useAsistencia";
import { Card, Spinner, Button } from "@/components/ui";
import { colors, spacing, fontSize, radius } from "@/theme";

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];

function hoy() { return new Date().toISOString().split("T")[0] ?? ""; }
function primerDiaMes(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0] ?? dateStr;
}
function fmtFecha(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

const PRESETS = [
  { label: "Este mes",  desde: () => primerDiaMes(0),  hasta: () => hoy() },
  { label: "Mes ant.",  desde: () => primerDiaMes(-1), hasta: () => primerDiaMes(0) },
];

function DateStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={stepperStyles.row}>
      <TouchableOpacity onPress={() => onChange(shiftDate(value, -7))} style={stepperStyles.btn}>
        <Text style={stepperStyles.arrow}>‹</Text>
      </TouchableOpacity>
      <Text style={stepperStyles.value}>{fmtFecha(value)}</Text>
      <TouchableOpacity onPress={() => onChange(shiftDate(value, 7))} style={stepperStyles.btn}>
        <Text style={stepperStyles.arrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  btn:   { width: 32, height: 32, alignItems: "center", justifyContent: "center",
           borderRadius: radius.md, backgroundColor: colors.slate100 },
  arrow: { fontSize: 20, color: colors.text, lineHeight: 24 },
  value: { fontSize: fontSize.base, fontWeight: "600", color: colors.text, minWidth: 72, textAlign: "center" },
});

export default function Dashboard() {
  const [desde, setDesde] = useState(primerDiaMes(0));
  const [hasta, setHasta] = useState(hoy());
  const [aplicado, setAplicado] = useState(false);

  const filtros: Record<string, string> = aplicado ? { desde, hasta } : {};
  const { data: registros, isLoading } = useAsistencia(filtros);

  const total      = registros?.length ?? 0;
  const presentes  = registros?.filter((r) => r.Asistencia === "Sí").length ?? 0;
  const tasa       = total > 0 ? Math.round((presentes / total) * 100) : 0;
  const justificados = registros?.filter((r) => r.Asistencia === "Justificado").length ?? 0;

  const porDia: Record<string, { total: number; presentes: number }> = {};
  registros?.forEach((r) => {
    if (!porDia[r.dia]) porDia[r.dia] = { total: 0, presentes: 0 };
    porDia[r.dia]!.total++;
    if (r.Asistencia === "Sí") porDia[r.dia]!.presentes++;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Estadísticas de asistencia</Text>

        {/* Filtros */}
        <Card style={styles.filtrosCard}>
          {/* Presets rápidos */}
          <View style={styles.presetsRow}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.label}
                onPress={() => { setDesde(p.desde()); setHasta(p.hasta()); setAplicado(false); }}
                style={styles.presetChip}
              >
                <Text style={styles.presetText}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Steppers */}
          <View style={styles.dateRow}>
            <View style={styles.datePicker}>
              <Text style={styles.label}>Desde</Text>
              <DateStepper value={desde} onChange={(v) => { setDesde(v); setAplicado(false); }} />
            </View>
            <View style={styles.dateSep} />
            <View style={styles.datePicker}>
              <Text style={styles.label}>Hasta</Text>
              <DateStepper value={hasta} onChange={(v) => { setHasta(v); setAplicado(false); }} />
            </View>
          </View>

          <Button
            label="Buscar"
            onPress={() => setAplicado(true)}
            style={{ marginTop: spacing.lg }}
          />
        </Card>

        {isLoading ? (
          <Spinner />
        ) : !aplicado ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>Selecciona un rango y busca</Text>
          </View>
        ) : total === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>Sin registros para este período</Text>
          </View>
        ) : (
          <>
            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statValue}>{total}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Presentes</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>{presentes}</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Tasa</Text>
                <Text style={[styles.statValue, { color: colors.brand }]}>{tasa}%</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statLabel}>Just.</Text>
                <Text style={[styles.statValue, { color: colors.warning }]}>{justificados}</Text>
              </Card>
            </View>

            {/* Barras por día */}
            {Object.keys(porDia).length > 1 && (
              <Card style={styles.barCard}>
                <Text style={styles.barTitle}>Por día</Text>
                {DIAS.filter((d) => porDia[d]).map((d) => {
                  const s = porDia[d]!;
                  const pct = Math.round((s.presentes / s.total) * 100);
                  return (
                    <View key={d} style={styles.barRow}>
                      <Text style={styles.barLabel}>{d.slice(0, 3)}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.barPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  container:   { padding: spacing["2xl"], gap: spacing.lg },
  title:       { fontSize: fontSize["2xl"], fontWeight: "700", color: colors.text },
  subtitle:    { fontSize: fontSize.sm, color: colors.textMuted },
  filtrosCard: { padding: spacing.lg },
  label:       { fontSize: fontSize.xs, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.xs },
  presetsRow:  { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  presetChip:  { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.full,
                 backgroundColor: colors.brandLight, borderWidth: 1, borderColor: colors.brand + "33" },
  presetText:  { fontSize: fontSize.xs, fontWeight: "600", color: colors.brand },
  dateRow:     { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  datePicker:  { flex: 1 },
  dateSep:     { width: 1, backgroundColor: colors.border, marginTop: spacing.lg, alignSelf: "stretch" },
  empty:       { alignItems: "center", paddingVertical: spacing["4xl"] },
  emptyEmoji:  { fontSize: 40, marginBottom: spacing.lg },
  emptyText:   { fontSize: fontSize.base, color: colors.textMuted },
  statsGrid:   { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard:    { flex: 1, minWidth: "45%", padding: spacing.lg, alignItems: "center" },
  statLabel:   { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: "500" },
  statValue:   { fontSize: fontSize["3xl"], fontWeight: "700", color: colors.text, marginTop: 4 },
  barCard:     { padding: spacing.lg, gap: spacing.md },
  barTitle:    { fontSize: fontSize.sm, fontWeight: "600", color: colors.text, marginBottom: spacing.xs },
  barRow:      { flexDirection: "row", alignItems: "center", gap: spacing.md },
  barLabel:    { width: 32, fontSize: fontSize.sm, color: colors.textMuted },
  barTrack:    { flex: 1, height: 8, backgroundColor: colors.slate100, borderRadius: radius.full, overflow: "hidden" },
  barFill:     { height: "100%", backgroundColor: colors.brand, borderRadius: radius.full },
  barPct:      { width: 36, fontSize: fontSize.xs, color: colors.textMuted, textAlign: "right" },
});

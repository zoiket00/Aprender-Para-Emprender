import { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useParticipantes, useAsistenciaDias, useCrearParticipante,
  useEditarParticipante, useEliminarParticipante,
} from "@/hooks/useParticipantes";
import { Button, Input, Spinner } from "@/components/ui";
import { colors, spacing, fontSize, radius } from "@/theme";
import type { DIAS_VALIDOS } from "@ape/shared";

type Dia = (typeof DIAS_VALIDOS)[number];
const DIAS: Dia[] = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];

interface FormData {
  nombre_bebe: string; nombre_madre: string;
  fase: string; programa: string; edad: string; dias: Dia[];
}
const EMPTY: FormData = { nombre_bebe: "", nombre_madre: "", fase: "", programa: "", edad: "", dias: [] };

export default function Participantes() {
  const { data: bebes, isLoading } = useParticipantes();
  const { data: diasMap } = useAsistenciaDias();
  const crear  = useCrearParticipante();
  const editar = useEditarParticipante();
  const eliminar = useEliminarParticipante();

  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<"crear" | "editar" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);

  const filtrados = (bebes ?? []).filter((b) =>
    [b.NombreBebe, b.NombreMadre, b.Fase].some((s) =>
      s.toLowerCase().includes(busqueda.toLowerCase())
    )
  );

  const toggleDia = (d: Dia) =>
    setForm((f) => ({
      ...f,
      dias: f.dias.includes(d) ? f.dias.filter((x) => x !== d) : [...f.dias, d],
    }));

  const abrirEditar = (b: typeof filtrados[0]) => {
    setEditId(b.id);
    setForm({
      nombre_bebe: b.NombreBebe, nombre_madre: b.NombreMadre,
      fase: b.Fase, programa: b.ProgramaMadre, edad: b.Edad,
      dias: (diasMap?.[b.NombreBebe] ?? []) as Dia[],
    });
    setModal("editar");
  };

  const handleSubmit = async () => {
    if (form.dias.length === 0) { Alert.alert("Error", "Selecciona al menos un día"); return; }
    if (!form.nombre_bebe || !form.nombre_madre) { Alert.alert("Error", "Nombre del bebé y madre son obligatorios"); return; }
    if (modal === "crear") await crear.mutateAsync(form);
    else if (editId) await editar.mutateAsync({ id: editId, ...form });
    setModal(null); setForm(EMPTY); setEditId(null);
  };

  const confirmarEliminar = (id: string, nombre: string) => {
    Alert.alert("Eliminar", `¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => eliminar.mutate(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Participantes</Text>
          <Text style={styles.subtitle}>{bebes?.length ?? 0} registrados</Text>
        </View>
        <Button label="+ Agregar" size="sm" onPress={() => { setForm(EMPTY); setModal("crear"); }} />
      </View>

      {/* Búsqueda */}
      <View style={styles.searchBox}>
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre..."
          placeholderTextColor={colors.slate400}
          style={styles.searchInput}
        />
      </View>

      {isLoading ? <Spinner fullScreen /> : (
        <FlatList
          data={filtrados}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: b }) => (
            <View style={styles.fila}>
              <View style={styles.filaInfo}>
                <Text style={styles.filaNombre}>{b.NombreBebe}</Text>
                <Text style={styles.filaMadre}>{b.NombreMadre}</Text>
                <View style={styles.diasRow}>
                  {(diasMap?.[b.NombreBebe] ?? []).map((d) => (
                    <View key={d} style={styles.diasBadge}>
                      <Text style={styles.diasBadgeText}>{d.slice(0, 3)}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.acciones}>
                <TouchableOpacity onPress={() => abrirEditar(b)} style={styles.btn}>
                  <Text style={styles.btnEdit}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmarEliminar(b.id, b.NombreBebe)} style={styles.btn}>
                  <Text style={styles.btnDelete}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal */}
      <Modal visible={modal !== null} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modal === "crear" ? "Agregar participante" : "Editar participante"}</Text>
            <TouchableOpacity onPress={() => setModal(null)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={[]}
            ListHeaderComponent={
              <View style={styles.modalForm}>
                <Input label="Nombre del bebé *" value={form.nombre_bebe} onChangeText={(v) => setForm((f) => ({ ...f, nombre_bebe: v }))} />
                <Input label="Nombre de la madre *" value={form.nombre_madre} onChangeText={(v) => setForm((f) => ({ ...f, nombre_madre: v }))} />
                <Input label="Fase / Institución" value={form.fase} onChangeText={(v) => setForm((f) => ({ ...f, fase: v }))} />
                <Input label="Programa" value={form.programa} onChangeText={(v) => setForm((f) => ({ ...f, programa: v }))} />
                <Input label="Edad (meses)" value={form.edad} onChangeText={(v) => setForm((f) => ({ ...f, edad: v }))} keyboardType="numeric" />

                <Text style={styles.label}>Días de asistencia *</Text>
                <View style={styles.diasSelector}>
                  {DIAS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => toggleDia(d)}
                      style={[styles.diaBtn, form.dias.includes(d) && styles.diaBtnActive]}
                    >
                      <Text style={[styles.diaBtnText, form.dias.includes(d) && styles.diaBtnTextActive]}>
                        {d.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Button
                  label={modal === "crear" ? "Agregar" : "Guardar"}
                  onPress={handleSubmit}
                  loading={crear.isPending || editar.isPending}
                  style={{ marginTop: spacing.lg }}
                />
              </View>
            }
            renderItem={() => null}
            keyExtractor={() => ""}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing["2xl"], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:        { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
  subtitle:     { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  searchBox:    { padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput:  { height: 40, backgroundColor: colors.bg, borderRadius: radius.lg, paddingHorizontal: spacing.md, fontSize: fontSize.sm, color: colors.text, borderWidth: 1, borderColor: colors.border },
  list:         { padding: spacing.lg, gap: spacing.sm },
  fila:         { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  filaInfo:     { flex: 1 },
  filaNombre:   { fontSize: fontSize.base, fontWeight: "600", color: colors.text },
  filaMadre:    { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  diasRow:      { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: spacing.sm },
  diasBadge:    { backgroundColor: colors.brandLight, borderRadius: radius.full, paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.brand + "44" },
  diasBadgeText:{ fontSize: 10, color: colors.brand, fontWeight: "600" },
  acciones:     { flexDirection: "row", gap: spacing.xs },
  btn:          { padding: spacing.sm },
  btnEdit:      { fontSize: 18 },
  btnDelete:    { fontSize: 18 },
  modalSafe:    { flex: 1, backgroundColor: colors.bg },
  modalHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing["2xl"], borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  modalTitle:   { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
  modalClose:   { fontSize: fontSize.xl, color: colors.textMuted },
  modalForm:    { padding: spacing["2xl"], gap: spacing.lg },
  label:        { fontSize: fontSize.sm, fontWeight: "500", color: colors.slate700 },
  diasSelector: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  diaBtn:       { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  diaBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  diaBtnText:   { fontSize: fontSize.sm, fontWeight: "600", color: colors.slate600 },
  diaBtnTextActive: { color: "#fff" },
});

import { router, Stack } from "expo-router";
import { AlertCircle, Check, X, Search, ChevronDown, Clock } from "lucide-react-native";
import React, { useState, useMemo } from "react";
import { createTicket as createTicketInDB, type TicketInsert } from "@/services/tickets";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
} from "react-native";
import { useAppStore } from "@/store/useAppStore";
import type { HSEPermitType } from "@/types";

const INTERVENTION_TYPES: { value: HSEPermitType | null; label: string }[] = [
  { value: null, label: "Ninguno" },
  { value: "CORTE ENERGIA", label: "CORTE ENERGIA" },
  { value: "ENERGIA", label: "ENERGIA" },
  { value: "MBTS", label: "MBTS" },
  { value: "PEXT - Atenuacion de FO", label: "PEXT - Atenuacion de FO" },
  { value: "PEXT - Corte de FO", label: "PEXT - Corte de FO" },
  { value: "PEXT - Falsa Averia", label: "PEXT - Falsa Averia" },
  { value: "RADIO", label: "RADIO" },
  { value: "RED - TRANSPORTE DE RED", label: "RED - TRANSPORTE DE RED" },
  { value: "SEGURIDAD", label: "SEGURIDAD" },
  { value: "SISTEMA ELECTRICO", label: "SISTEMA ELECTRICO" },
  { value: "TX", label: "TX" },
];

const TASK_CATEGORIES = [
  "Alarmas en Gestor",
  "Alarmas Externas",
  "Caida",
  "Caida de clientes",
  "Corte_Energia",
  "Energia",
  "MBTS",
  "Solicitud cliente",
  "TX",
  "PEXT - Atenuacion de FO",
  "PEXT - Corte de FO",
  "PEXT - Falsa Averia",
  "Mantenimiento",
  "Instalacion",
  "Verificacion",
];

export default function CreateTicketScreen() {
  const { sites, currentUser } = useAppStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    ticketSource: "",
    siteId: sites[0]?.id || "",
    siteName: "",
    faultLevel: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    taskCategory: "",
    taskSubcategory: "",
    platformAffected: "",
    attentionType: null as HSEPermitType | null,
    serviceAffected: "",
    descripcion: "",
  });

  const getSLAHours = (faultLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"): number => {
    const site = sites.find(s => s.id === formData.siteId);
    const zonaUpper = site?.zona?.toUpperCase() || '';
    const isLima = zonaUpper === 'CENTRO' || zonaUpper === 'NORTE' || zonaUpper === 'SUR';
    
    switch (faultLevel) {
      case "CRITICAL":
        return isLima ? 2 : 4;
      case "HIGH":
        return 8;
      case "MEDIUM":
        return 24;
      case "LOW":
        return 72;
      default:
        return 24;
    }
  };

  const slaHours = getSLAHours(formData.faultLevel);

  const [searchDescription, setSearchDescription] = useState("");
  const [searchSite, setSearchSite] = useState("");
  const [searchIntervention, setSearchIntervention] = useState("");
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showInterventionModal, setShowInterventionModal] = useState(false);

  const filteredDescriptions = useMemo(() => {
    return TASK_CATEGORIES.filter((cat) =>
      cat.toLowerCase().includes(searchDescription.toLowerCase())
    );
  }, [searchDescription]);

  const filteredSites = useMemo(() => {
    return sites.filter((site) =>
      site.name.toLowerCase().includes(searchSite.toLowerCase()) ||
      site.siteCode.toLowerCase().includes(searchSite.toLowerCase()) ||
      site.region.toLowerCase().includes(searchSite.toLowerCase())
    );
  }, [sites, searchSite]);

  const filteredInterventions = useMemo(() => {
    return INTERVENTION_TYPES.filter((type) =>
      type.label.toLowerCase().includes(searchIntervention.toLowerCase())
    );
  }, [searchIntervention]);

  const selectedSite = useMemo(() => {
    return sites.find((s) => s.id === formData.siteId);
  }, [sites, formData.siteId]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.taskCategory.trim()) {
      newErrors.taskCategory = "La categoría es obligatoria";
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = "La descripción es obligatoria";
    }

    if (!formData.siteId) {
      newErrors.siteId = "Debes seleccionar un sitio";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('[CreateTicket] 🎟️ Creating ticket in Supabase...');

      const selectedSiteObj = sites.find(s => s.id === formData.siteId);
      if (!selectedSiteObj) {
        throw new Error('Site not found');
      }

      const openedAt = new Date();
      const slaDeadlineAt = new Date(openedAt.getTime() + slaHours * 60 * 60 * 1000);

      const ticketInsert: TicketInsert = {
        ticket_source: formData.ticketSource.trim() || `TKT-${Date.now()}`,
        site_id: selectedSiteObj.siteCode,
        site_name: selectedSiteObj.name,
        fault_level: formData.faultLevel,
        task_category: formData.taskCategory,
        task_subcategory: formData.taskSubcategory || null,
        platform_affected: formData.platformAffected || null,
        attention_type: formData.attentionType || null,
        service_affected: formData.serviceAffected || null,
        fault_occur_time: openedAt.toISOString(),
        complete_time: null,
        estado: 'recepcion',
        descripcion: formData.descripcion,
        created_by: null,
      };

      console.log('[CreateTicket] 📤 Inserting ticket to Supabase:', ticketInsert);
      const { data, error } = await createTicketInDB(ticketInsert);
      
      if (error) {
        console.error('[CreateTicket] ❌ Error creating ticket in Supabase:', error.message);
        throw new Error(error.message);
      }
      
      console.log('[CreateTicket] ✅ Ticket created in Supabase:', data);

      Alert.alert("Éxito", "Ticket creado correctamente", [
        {
          text: "OK",
          onPress: () => {
            router.back();
          },
        },
      ]);
      
      setFormData({
        ticketSource: "",
        siteId: sites[0]?.id || "",
        siteName: "",
        faultLevel: "MEDIUM",
        taskCategory: "",
        taskSubcategory: "",
        platformAffected: "",
        attentionType: null,
        serviceAffected: "",
        descripcion: "",
      });
    } catch (error) {
      console.error('[CreateTicket] ❌ Exception creating ticket:', error);
      Alert.alert("Error", "Ocurrió un error al crear el ticket: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Crear Ticket",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>


          <View style={styles.section}>
            <Text style={styles.label}>Ticket Source (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: ITSM-12345"
              value={formData.ticketSource}
              onChangeText={(text) => setFormData({ ...formData, ticketSource: text })}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Categoría de Tarea <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.searchableInput,
                errors.taskCategory && styles.inputError,
              ]}
              onPress={() => setShowDescriptionModal(true)}
            >
              <Search size={20} color="#6B7280" />
              <Text
                style={[
                  styles.searchableInputText,
                  !formData.taskCategory && styles.searchableInputPlaceholder,
                ]}
              >
                {formData.taskCategory || "Buscar categoría..."}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
            {errors.taskCategory && (
              <View style={styles.errorContainer}>
                <AlertCircle size={14} color="#DC2626" />
                <Text style={styles.errorText}>{errors.taskCategory}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Subcategoría de Tarea (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Detalles adicionales"
              value={formData.taskSubcategory}
              onChangeText={(text) => setFormData({ ...formData, taskSubcategory: text })}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Descripción <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe el problema detalladamente"
              value={formData.descripcion}
              onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
              multiline
              numberOfLines={4}
            />
            {errors.descripcion && (
              <View style={styles.errorContainer}>
                <AlertCircle size={14} color="#DC2626" />
                <Text style={styles.errorText}>{errors.descripcion}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Nivel de Falla <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.optionsGrid}>
              {[
                { value: "CRITICAL" as const, label: "Crítico (P0)", color: "#DC2626" },
                { value: "HIGH" as const, label: "Alto (P1)", color: "#EA580C" },
                { value: "MEDIUM" as const, label: "Medio (P2)", color: "#CA8A04" },
                { value: "LOW" as const, label: "Bajo (P3)", color: "#16A34A" },
              ].map((option) => {
                const optionSla = getSLAHours(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      formData.faultLevel === option.value && {
                        backgroundColor: option.color + "20",
                        borderColor: option.color,
                      },
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, faultLevel: option.value });
                    }}
                  >
                    <View style={styles.optionButtonContent}>
                      <Text
                        style={[
                          styles.optionText,
                          formData.faultLevel === option.value && { color: option.color },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionSlaText,
                          formData.faultLevel === option.value && { color: option.color },
                        ]}
                      >
                        SLA: {optionSla}h
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={styles.slaDisplay}>
              <Clock size={20} color="#2563EB" />
              <View style={styles.slaDisplayContent}>
                <Text style={styles.slaDisplayLabel}>SLA Asignado</Text>
                <Text style={styles.slaDisplayValue}>{slaHours} horas</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Sitio <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.searchableInput,
                errors.siteId && styles.inputError,
              ]}
              onPress={() => setShowSiteModal(true)}
            >
              <Search size={20} color="#6B7280" />
              <View style={styles.searchableInputTextContainer}>
                <Text
                  style={[
                    styles.searchableInputText,
                    !formData.siteId && styles.searchableInputPlaceholder,
                  ]}
                >
                  {selectedSite ? selectedSite.name : "Buscar sitio..."}
                </Text>
                {selectedSite && (
                  <Text style={styles.searchableInputSubtext}>
                    {selectedSite.siteCode} • {selectedSite.region} • {selectedSite.zona}
                  </Text>
                )}
              </View>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
            {errors.siteId && (
              <View style={styles.errorContainer}>
                <AlertCircle size={14} color="#DC2626" />
                <Text style={styles.errorText}>{errors.siteId}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Plataforma Afectada (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Router X, Antena Y"
              value={formData.platformAffected}
              onChangeText={(text) => setFormData({ ...formData, platformAffected: text })}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Tipo de Atención</Text>
            <TouchableOpacity
              style={styles.searchableInput}
              onPress={() => setShowInterventionModal(true)}
            >
              <Search size={20} color="#6B7280" />
              <Text
                style={[
                  styles.searchableInputText,
                  !formData.attentionType && styles.searchableInputPlaceholder,
                ]}
              >
                {formData.attentionType
                  ? INTERVENTION_TYPES.find((t) => t.value === formData.attentionType)?.label
                  : "Buscar tipo de atención..."}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Servicio Afectado (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Internet, Telefonía"
              value={formData.serviceAffected}
              onChangeText={(text) => setFormData({ ...formData, serviceAffected: text })}
            />
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? "Creando..." : "Crear Ticket"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showDescriptionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDescriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Categoría de Tarea</Text>
              <TouchableOpacity onPress={() => setShowDescriptionModal(false)}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchContainer}>
              <Search size={20} color="#6B7280" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar categoría..."
                value={searchDescription}
                onChangeText={setSearchDescription}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredDescriptions}
              keyExtractor={(item) => item}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formData.taskCategory === item && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, taskCategory: item });
                    setShowDescriptionModal(false);
                    setSearchDescription("");
                  }}
                >
                  <Text style={styles.modalItemNumber}>{index + 1}.</Text>
                  <Text
                    style={[
                      styles.modalItemText,
                      formData.taskCategory === item && styles.modalItemTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                  {formData.taskCategory === item && <Check size={20} color="#2563EB" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No se encontraron categorías</Text>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSiteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSiteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Sitio</Text>
              <TouchableOpacity onPress={() => setShowSiteModal(false)}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchContainer}>
              <Search size={20} color="#6B7280" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar sitio por nombre, código o región..."
                value={searchSite}
                onChangeText={setSearchSite}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredSites}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formData.siteId === item.id && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, siteId: item.id, siteName: item.name });
                    setShowSiteModal(false);
                    setSearchSite("");
                  }}
                >
                  <Text style={styles.modalItemNumber}>{index + 1}.</Text>
                  <View style={styles.modalItemContent}>
                    <Text
                      style={[
                        styles.modalItemText,
                        formData.siteId === item.id && styles.modalItemTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.modalItemSubtext}>
                      {item.siteCode} {"•"} {item.region} {"•"} {item.zona}
                    </Text>
                  </View>
                  {formData.siteId === item.id && <Check size={20} color="#2563EB" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No se encontraron sitios</Text>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showInterventionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInterventionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tipo de Atención</Text>
              <TouchableOpacity onPress={() => setShowInterventionModal(false)}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchContainer}>
              <Search size={20} color="#6B7280" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar tipo de atención..."
                value={searchIntervention}
                onChangeText={setSearchIntervention}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredInterventions}
              keyExtractor={(item) => item.value || "none"}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    formData.attentionType === item.value && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, attentionType: item.value });
                    setShowInterventionModal(false);
                    setSearchIntervention("");
                  }}
                >
                  <Text style={styles.modalItemNumber}>{index + 1}.</Text>
                  <Text
                    style={[
                      styles.modalItemText,
                      formData.attentionType === item.value && styles.modalItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {formData.attentionType === item.value && <Check size={20} color="#2563EB" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No se encontraron tipos de falla</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#DC2626",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 10,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
  },
  optionsGrid: {
    gap: 8,
  },
  optionButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
  },
  optionButtonContent: {
    flexDirection: "column" as const,
    gap: 4,
  },
  optionSlaText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500" as const,
  },
  optionButtonActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  optionTextActive: {
    color: "#2563EB",
  },
  optionSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#374151",
  },
  slaDisplay: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  slaDisplayContent: {
    flex: 1,
  },
  slaDisplayLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  slaDisplayValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#2563EB",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 16,
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  searchableInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  searchableInputTextContainer: {
    flex: 1,
  },
  searchableInputText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600" as const,
  },
  searchableInputPlaceholder: {
    color: "#9CA3AF",
    fontWeight: "400" as const,
  },
  searchableInputSubtext: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end" as const,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  modalSearchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F3F4F6",
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  modalItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalItemActive: {
    backgroundColor: "#EFF6FF",
  },
  modalItemNumber: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
    minWidth: 30,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
  },
  modalItemTextActive: {
    color: "#2563EB",
  },
  modalItemSubtext: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center" as const,
    paddingVertical: 32,
  },
});

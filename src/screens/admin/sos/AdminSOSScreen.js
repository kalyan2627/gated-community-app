/**
 * AdminSOSScreen.js
 * Admin screen to view and respond to all SOS emergency alerts.
 * Actions: Acknowledge → Respond → Resolve (with resolution note).
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, StatusBar, FlatList,
  TouchableOpacity, Modal, TextInput, ScrollView, Animated,
} from 'react-native';
import { useSecurityStore } from '../../../store/securityStore';
import { useAuthStore }     from '../../../store/AuthStore';

// ─── Theme ────────────────────────────────────────────────────────────────────
const P = {
  teal:       '#1A7A7A',
  tealSoft:   '#E8F5F5',
  bg:         '#F0F4F4',
  surface:    '#FFFFFF',
  border:     '#D1E8E8',
  text:       '#1E293B',
  textMuted:  '#64748B',
  danger:     '#DC2626',
  dangerSoft: '#FEE2E2',
  warning:    '#D97706',
  warnSoft:   '#FEF3C7',
  blue:       '#2563EB',
  blueSoft:   '#DBEAFE',
  green:      '#16A34A',
  greenSoft:  '#DCFCE7',
};

const STATUS_CFG = {
  TRIGGERED:    { label: '🚨 TRIGGERED',    bg: P.dangerSoft, text: P.danger,  priority: 0 },
  ACKNOWLEDGED: { label: '👮 ACKNOWLEDGED', bg: P.warnSoft,   text: P.warning, priority: 1 },
  IN_PROGRESS:  { label: '🔵 IN PROGRESS',  bg: P.blueSoft,   text: P.blue,    priority: 2 },
  RESOLVED:     { label: '✅ RESOLVED',     bg: P.greenSoft,  text: P.green,   priority: 3 },
};

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Pulse dot for active alerts ─────────────────────────────────────────────
function PulseDot() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[s.pulseDot, { opacity: anim }]} />
  );
}

// ─── Single SOS Card ──────────────────────────────────────────────────────────
function SOSCard({ alert, onAcknowledge, onRespond, onResolve }) {
  const [expanded, setExpanded] = useState(false);
  const cfg    = STATUS_CFG[alert.status] || STATUS_CFG['RESOLVED'];
  const isActive = alert.status !== 'RESOLVED';

  return (
    <View style={[s.card, isActive && s.cardActive]}>
      {/* Header row */}
      <TouchableOpacity style={s.cardHeader} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={{ flex: 1 }}>
          <View style={s.cardTitleRow}>
            {isActive && <PulseDot />}
            <Text style={[s.cardTitle, isActive && { color: P.danger }]} numberOfLines={1}>
              {alert.residentName} · Unit {alert.unit}
            </Text>
          </View>
          <Text style={s.cardType}>{alert.type}{alert.description ? ` — ${alert.description}` : ''}</Text>
          <Text style={s.cardTime}>🕐 {fmt(alert.triggeredAt)}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[s.statusText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </TouchableOpacity>

      {/* Action buttons for non-resolved */}
      {isActive && (
        <View style={s.actionRow}>
          {alert.status === 'TRIGGERED' && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: P.warnSoft, borderColor: P.warning }]}
              onPress={() => onAcknowledge(alert.id)}>
              <Text style={[s.actionBtnText, { color: P.warning }]}>👮 Acknowledge</Text>
            </TouchableOpacity>
          )}
          {['TRIGGERED', 'ACKNOWLEDGED'].includes(alert.status) && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: P.blueSoft, borderColor: P.blue }]}
              onPress={() => onRespond(alert.id)}>
              <Text style={[s.actionBtnText, { color: P.blue }]}>🏃 Respond</Text>
            </TouchableOpacity>
          )}
          {alert.status !== 'RESOLVED' && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: P.greenSoft, borderColor: P.green }]}
              onPress={() => onResolve(alert)}>
              <Text style={[s.actionBtnText, { color: P.green }]}>✅ Resolve</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Timeline (expandable) */}
      {expanded && alert.timeline?.length > 0 && (
        <View style={s.timeline}>
          <Text style={s.timelineTitle}>Timeline</Text>
          {[...alert.timeline].reverse().map((t, i) => (
            <View key={i} style={s.timelineRow}>
              <View style={s.timelineDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.timelineAction}>{t.action}</Text>
                <Text style={s.timelineTime}>{fmt(t.at)}</Text>
              </View>
            </View>
          ))}
          {alert.resolution ? (
            <View style={[s.resolutionBox]}>
              <Text style={s.resolutionLabel}>Resolution Note:</Text>
              <Text style={s.resolutionText}>{alert.resolution}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Expand toggle */}
      <TouchableOpacity style={s.expandBtn} onPress={() => setExpanded(e => !e)}>
        <Text style={s.expandText}>{expanded ? '▲ Hide timeline' : '▼ View timeline'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminSOSScreen({ navigation }) {
  const sosAlerts       = useSecurityStore(s => s.sosAlerts);
  const acknowledgeSOS  = useSecurityStore(s => s.acknowledgeSOS);
  const respondSOS      = useSecurityStore(s => s.respondSOS);
  const resolveSOS      = useSecurityStore(s => s.resolveSOS);
  const user            = useAuthStore(s => s.user);

  const [filter, setFilter]           = useState('ALL');
  const [resolveModal, setResolveModal] = useState(null); // holds alert object
  const [resolution, setResolution]   = useState('');

  const adminId   = user?.id   || 'admin1';
  const adminName = user?.name || 'Admin';

  // Sort: active first, then by triggeredAt desc
  const sorted = [...(sosAlerts || [])].sort((a, b) => {
    const pa = STATUS_CFG[a.status]?.priority ?? 9;
    const pb = STATUS_CFG[b.status]?.priority ?? 9;
    if (pa !== pb) return pa - pb;
    return new Date(b.triggeredAt) - new Date(a.triggeredAt);
  });

  const FILTERS = [
    { id: 'ALL',         label: 'All' },
    { id: 'TRIGGERED',   label: '🚨 Triggered' },
    { id: 'ACKNOWLEDGED',label: '👮 Acknowledged' },
    { id: 'IN_PROGRESS', label: '🔵 In Progress' },
    { id: 'RESOLVED',    label: '✅ Resolved' },
  ];

  const filtered = filter === 'ALL' ? sorted : sorted.filter(a => a.status === filter);

  const activeCount   = (sosAlerts || []).filter(a => a.status !== 'RESOLVED').length;
  const resolvedCount = (sosAlerts || []).filter(a => a.status === 'RESOLVED').length;

  const handleAcknowledge = (id) => acknowledgeSOS(id, adminId, adminName);
  const handleRespond     = (id) => respondSOS(id, adminId, adminName);
  const handleOpenResolve = (alert) => { setResolveModal(alert); setResolution(''); };
  const handleResolve     = () => {
    if (!resolveModal) return;
    resolveSOS(resolveModal.id, adminId, adminName, resolution.trim());
    setResolveModal(null);
    setResolution('');
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={P.teal} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>🚨 SOS Alerts</Text>
            <Text style={s.headerSub}>
              {activeCount > 0 ? `${activeCount} active · ` : ''}{resolvedCount} resolved
            </Text>
          </View>
        </View>
      </View>

      {/* Stats bar */}
      <View style={s.statsBar}>
        {[
          { label: 'Triggered',    val: (sosAlerts||[]).filter(a=>a.status==='TRIGGERED').length,    color: P.danger  },
          { label: 'Acknowledged', val: (sosAlerts||[]).filter(a=>a.status==='ACKNOWLEDGED').length,  color: P.warning },
          { label: 'In Progress',  val: (sosAlerts||[]).filter(a=>a.status==='IN_PROGRESS').length,   color: P.blue    },
          { label: 'Resolved',     val: resolvedCount,                                                color: P.green   },
        ].map(item => (
          <View key={item.label} style={s.statPill}>
            <Text style={[s.statVal, { color: item.color }]}>{item.val}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter chips */}
      <View style={s.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.id}
              style={[s.chip, filter === f.id && s.chipActive]}
              onPress={() => setFilter(f.id)}>
              <Text style={[s.chipText, filter === f.id && { color: '#FFF' }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Alert list */}
      <FlatList
        data={filtered}
        keyExtractor={a => a.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
            <Text style={s.emptyText}>No SOS alerts</Text>
            <Text style={s.emptySubText}>All clear — community is safe</Text>
          </View>
        }
        renderItem={({ item }) => (
          <SOSCard
            alert={item}
            onAcknowledge={handleAcknowledge}
            onRespond={handleRespond}
            onResolve={handleOpenResolve}
          />
        )}
      />

      {/* Resolve Modal */}
      <Modal visible={!!resolveModal} transparent animationType="slide" onRequestClose={() => setResolveModal(null)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>✅ Resolve SOS Alert</Text>
            {resolveModal && (
              <Text style={s.modalSub}>
                {resolveModal.residentName} · Unit {resolveModal.unit} · {resolveModal.type}
              </Text>
            )}
            <Text style={s.modalLabel}>Resolution Note (optional)</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g. Situation assessed, no injury, family notified..."
              placeholderTextColor={P.textMuted}
              value={resolution}
              onChangeText={setResolution}
              multiline
              numberOfLines={3}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setResolveModal(null)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.resolveBtn} onPress={handleResolve}>
                <Text style={s.resolveBtnText}>Mark Resolved</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: P.teal },
  header:         { backgroundColor: P.teal, paddingTop: 40, paddingBottom: 16, paddingHorizontal: 20 },
  backText:       { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  headerRow:      { flexDirection: 'row', alignItems: 'center' },
  headerTitle:    { fontSize: 22, fontWeight: '900', color: '#FFF' },
  headerSub:      { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 1 },

  statsBar:       { flexDirection: 'row', backgroundColor: P.teal, paddingHorizontal: 16, paddingBottom: 14 },
  statPill:       { flex: 1, alignItems: 'center' },
  statVal:        { fontSize: 20, fontWeight: '900' },
  statLabel:      { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2 },

  filterWrap:     { backgroundColor: P.bg, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: P.border },
  chip:           { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: P.border, backgroundColor: P.surface },
  chipActive:     { backgroundColor: P.teal, borderColor: P.teal },
  chipText:       { fontSize: 11, fontWeight: '600', color: P.textMuted },

  // Card
  card:           { backgroundColor: P.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: P.border },
  cardActive:     { borderColor: P.danger, borderWidth: 1.5 },
  cardHeader:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  pulseDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: P.danger },
  cardTitle:      { fontSize: 14, fontWeight: '800', color: P.text, flex: 1 },
  cardType:       { fontSize: 12, color: P.textMuted, marginBottom: 2 },
  cardTime:       { fontSize: 11, color: P.textMuted },
  statusBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusText:     { fontSize: 10, fontWeight: '800' },

  actionRow:      { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn:      { flex: 1, minWidth: 90, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  actionBtnText:  { fontSize: 12, fontWeight: '700' },

  expandBtn:      { marginTop: 10, alignItems: 'center' },
  expandText:     { fontSize: 11, color: P.textMuted, fontWeight: '600' },

  timeline:       { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: P.border },
  timelineTitle:  { fontSize: 11, fontWeight: '800', color: P.textMuted, letterSpacing: 0.5, marginBottom: 8 },
  timelineRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  timelineDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: P.teal, marginTop: 4 },
  timelineAction: { fontSize: 12, fontWeight: '600', color: P.text },
  timelineTime:   { fontSize: 10, color: P.textMuted, marginTop: 1 },
  resolutionBox:  { backgroundColor: P.greenSoft, borderRadius: 8, padding: 10, marginTop: 6 },
  resolutionLabel:{ fontSize: 10, fontWeight: '800', color: P.green, marginBottom: 2 },
  resolutionText: { fontSize: 12, color: P.text },

  empty:          { alignItems: 'center', paddingTop: 60 },
  emptyText:      { fontSize: 16, fontWeight: '800', color: P.text },
  emptySubText:   { fontSize: 13, color: P.textMuted, marginTop: 4 },

  // Modal
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:          { backgroundColor: P.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle:     { fontSize: 18, fontWeight: '900', color: P.text, marginBottom: 4 },
  modalSub:       { fontSize: 13, color: P.textMuted, marginBottom: 16 },
  modalLabel:     { fontSize: 12, fontWeight: '700', color: P.text, marginBottom: 6 },
  modalInput:     { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                    fontSize: 13, color: P.text, borderColor: P.border, backgroundColor: P.bg,
                    minHeight: 80, textAlignVertical: 'top' },
  modalActions:   { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn:      { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: P.border, alignItems: 'center' },
  cancelText:     { fontSize: 14, fontWeight: '700', color: P.textMuted },
  resolveBtn:     { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: P.green, alignItems: 'center' },
  resolveBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar,
  TextInput, FlatList, ScrollView,
} from 'react-native';
import { useSecurityStore } from '../../../store/securityStore';

const HEADER_BG = '#1A7A7A';

const fmt = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_META = {
  PENDING:      { label: 'Pending',      color: '#D97706', bg: '#FEF3C7' },
  OTP_VERIFIED: { label: 'OTP Verified', color: '#0F766E', bg: '#CCFBF1' },
  CHECKED_IN:   { label: 'Inside',       color: '#1D4ED8', bg: '#DBEAFE' },
  DELIVERED:    { label: 'Delivered',    color: '#065F46', bg: '#D1FAE5' },
  CHECKED_OUT:  { label: 'Checked Out',  color: '#64748B', bg: '#F1F5F9' },
};

const PROVIDER_ICON = {
  Amazon: '📦', Swiggy: '🍔', Zomato: '🍕', Flipkart: '🛍️', BigBasket: '🥦',
};

const FILTERS = [
  { key: 'all',          label: 'All' },
  { key: 'PENDING',      label: 'Pending' },
  { key: 'OTP_VERIFIED', label: 'Verified' },
  { key: 'CHECKED_IN',   label: 'Inside' },
  { key: 'DELIVERED',    label: 'Delivered' },
  { key: 'CHECKED_OUT',  label: 'Checked Out' },
];

export default function AdminDeliveryScreen({ navigation }) {
  const deliveries = useSecurityStore(s => s.deliveries);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');

  const filtered = deliveries
    .filter(d => filter === 'all' || d.status === filter)
    .filter(d =>
      !search ||
      (d.provider || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.hostUnit  || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.deliveryPersonName || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.deliveryPersonPhone || '').includes(search)
    );

  // Summary counts
  const pending    = deliveries.filter(d => d.status === 'PENDING').length;
  const inside     = deliveries.filter(d => ['OTP_VERIFIED', 'CHECKED_IN'].includes(d.status)).length;
  const delivered  = deliveries.filter(d => d.status === 'DELIVERED').length;

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_BG} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>📦 Delivery Entries</Text>
            <Text style={s.headerSub}>{deliveries.length} total · {inside} inside now</Text>
          </View>
        </View>
      </View>

      {/* Summary pills */}
      <View style={s.summaryRow}>
        <View style={[s.summaryPill, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[s.summaryVal, { color: '#D97706' }]}>{pending}</Text>
          <Text style={s.summaryLab}>Pending</Text>
        </View>
        <View style={[s.summaryPill, { backgroundColor: '#DBEAFE' }]}>
          <Text style={[s.summaryVal, { color: '#1D4ED8' }]}>{inside}</Text>
          <Text style={s.summaryLab}>Inside</Text>
        </View>
        <View style={[s.summaryPill, { backgroundColor: '#D1FAE5' }]}>
          <Text style={[s.summaryVal, { color: '#065F46' }]}>{delivered}</Text>
          <Text style={s.summaryLab}>Delivered</Text>
        </View>
        <View style={[s.summaryPill, { backgroundColor: '#F1F5F9' }]}>
          <Text style={[s.summaryVal, { color: '#64748B' }]}>{deliveries.length}</Text>
          <Text style={s.summaryLab}>Total</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Search provider, unit, person…"
          placeholderTextColor="#7A9E9E"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterChipText, filter === f.key && s.filterChipTextActive]}>
              {f.label}
              {f.key === 'all'
                ? ` (${deliveries.length})`
                : ` (${deliveries.filter(d => d.status === f.key).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={d => d.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>📦</Text>
            <Text style={s.emptyText}>No delivery entries found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const meta  = STATUS_META[item.status] || STATUS_META.PENDING;
          const icon  = PROVIDER_ICON[item.provider] || '📦';
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.avatar}>
                  <Text style={{ fontSize: 22 }}>{icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{item.provider || 'Delivery'}</Text>
                  <Text style={s.cardSub}>🏠 Unit {item.hostUnit} · {item.hostResidentName || '—'}</Text>
                  {item.deliveryPersonName ? (
                    <Text style={s.cardSub}>🚴 {item.deliveryPersonName}  {item.deliveryPersonPhone ? `· ${item.deliveryPersonPhone}` : ''}</Text>
                  ) : null}
                </View>
                <View style={[s.badge, { backgroundColor: meta.bg }]}>
                  <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <View style={s.cardMeta}>
                <Text style={s.metaText}>🕐 {fmt(item.createdAt)}</Text>
                {item.checkedInAt ? (
                  <Text style={s.metaText}>🚪 Entered {fmt(item.checkedInAt)}</Text>
                ) : null}
                {item.verifiedByName ? (
                  <Text style={s.metaText}>✅ By {item.verifiedByName}</Text>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:            { flex: 1, backgroundColor: '#E8F5F5' },
  header:            { backgroundColor: HEADER_BG, paddingTop: 40, paddingBottom: 16, paddingHorizontal: 20 },
  backText:          { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  headerRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle:       { fontSize: 22, fontWeight: '900', color: '#FFF' },
  headerSub:         { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 1 },

  summaryRow:        { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF' },
  summaryPill:       { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  summaryVal:        { fontSize: 18, fontWeight: '900' },
  summaryLab:        { fontSize: 9, fontWeight: '700', color: '#64748B', marginTop: 2 },

  searchWrap:        { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#D0EEEE' },
  searchInput:       { backgroundColor: '#E8F5F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: '#1A2E2E' },

  filterScroll:      { backgroundColor: '#FFF', maxHeight: 52, borderBottomWidth: 1, borderBottomColor: '#D0EEEE' },
  filterChip:        { paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 4 },
  filterChipActive:  { borderBottomWidth: 3, borderBottomColor: '#1A7A7A' },
  filterChipText:    { fontSize: 13, color: '#7A9E9E', fontWeight: '600' },
  filterChipTextActive: { color: '#1A7A7A', fontWeight: '800' },

  list:              { padding: 14, paddingBottom: 40 },
  card:              { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#D0EEEE', elevation: 1 },
  cardTop:           { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar:            { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5F5', alignItems: 'center', justifyContent: 'center' },
  cardName:          { fontSize: 15, fontWeight: '800', color: '#1A2E2E' },
  cardSub:           { fontSize: 12, color: '#7A9E9E', marginTop: 2 },
  badge:             { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:         { fontSize: 11, fontWeight: '800' },
  cardMeta:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#D0EEEE' },
  metaText:          { fontSize: 11, color: '#7A9E9E' },
  empty:             { alignItems: 'center', paddingTop: 60 },
  emptyText:         { fontSize: 15, color: '#7A9E9E', marginTop: 12 },
});

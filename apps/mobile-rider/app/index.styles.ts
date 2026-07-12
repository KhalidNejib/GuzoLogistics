import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');


const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0f172a' : '#f8fafc' },

  loadingContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6366f1', fontWeight: '900', marginTop: 16, letterSpacing: 2, fontSize: 11 },

  // Header (Premium Glass)
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 16 },
  glassHeader: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(79, 70, 229, 0.3)' : 'rgba(255, 255, 255, 0.9)',
    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
    overflow: 'hidden',
    height: 42,
    justifyContent: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pilotInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: {
    width: 26, height: 26, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 13,
    borderWidth: 1, borderColor: isDark ? '#334155' : 'white', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  pilotName: { fontSize: 11, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a' },
  
  headerRightCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButtonMicro: {
    width: 30, height: 30, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0',
  },
  badgeMicro: {
    position: 'absolute', top: 6, right: 6, width: 6, height: 6,
    backgroundColor: '#f43f5e', borderRadius: 3,
  },

  // 🚀 TACTICAL STRIP (Vertical Sidebar)
  tacticalStrip: {
    position: 'absolute',
    left: 14,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(79, 70, 229, 0.4)' : 'rgba(79, 70, 229, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 1000,
  },
  stripSection: { flexDirection: 'column', alignItems: 'center' },
  pillStat: { alignItems: 'center', minWidth: 46, paddingVertical: 4 },
  pillValue: { fontSize: 15, fontWeight: '900', color: '#4f46e5', letterSpacing: -0.5 },
  pillLabel: { fontSize: 7, fontWeight: '900', color: isDark ? '#94a3b8' : '#64748b', letterSpacing: 1, marginTop: -1, textTransform: 'uppercase' },
  pillDivider: { width: 20, height: 1.5, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', marginVertical: 8 },
  
  liveIndicatorContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveIndicatorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444', shadowColor: '#ef4444', shadowOpacity: 0.8, shadowRadius: 4 },
  liveIndicatorText: { fontSize: 9, fontWeight: '900', color: '#ef4444', letterSpacing: 1.5 },

  mapControls: { position: 'absolute', right: 16, alignItems: 'center', zIndex: 5 },
  mapBtn: {
    backgroundColor: isDark ? '#1e293b' : 'white', width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12,
    borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', elevation: 10,
  },

  compactCard: {
    position: 'absolute', left: 16, right: 16, backgroundColor: isDark ? 'rgba(30, 41, 59, 1)' : 'white',
    borderRadius: 24, padding: 16,
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 15 }, shadowOpacity: isDark ? 0.4 : 0.12, shadowRadius: 25,
    borderWidth: 1.5, borderColor: isDark ? '#4f46e5' : '#eff6ff', elevation: 15, zIndex: 999,
  },
  compactCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDotLg: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  compactCardTitle: { fontSize: 13, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a', letterSpacing: -0.3 },
  compactCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compactCardAddr: { fontSize: 11, fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b' },
  compactBtn: { flex: 1, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  compactBtnText: { fontSize: 10, fontWeight: '900', color: 'white', letterSpacing: 1.2, textTransform: 'uppercase' },

  noGps: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#0f172a' : '#f8fafc' },
  noGpsText: { marginTop: 16, color: isDark ? '#94a3b8' : '#64748b', fontWeight: '800', letterSpacing: 1, fontSize: 12 },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.36,
    backgroundColor: isDark ? '#0f172a' : 'white', borderTopLeftRadius: 36, borderTopRightRadius: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: isDark ? 0.3 : 0.07, shadowRadius: 24,
    elevation: 32, zIndex: 10,
  },
  dragger: { width: 44, height: 5, borderRadius: 3, backgroundColor: isDark ? '#475569' : '#f1f5f9' },
  tabs: { 
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16, gap: 8,
    backgroundColor: isDark ? '#0f172a' : 'white',
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', backgroundColor: isDark ? '#1e293b' : '#fafafa',
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  tabActive: {
    backgroundColor: isDark ? '#6366f1' : '#0f172a', borderColor: isDark ? '#6366f1' : '#0f172a',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 12,
  },
  tabText: { fontSize: 10, fontWeight: '900', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: 1.5 },
  tabTextActive: { color: 'white' },
  scroll: { flex: 1 },
  listPad: { paddingBottom: 40, paddingHorizontal: 24 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, width: '100%' },
  emptyText: { color: isDark ? '#475569' : '#cbd5e1', fontWeight: '900', marginTop: 12, fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 },

  offlinePanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: isDark ? '#0f172a' : 'white', borderTopLeftRadius: 48, borderTopRightRadius: 48,
    paddingHorizontal: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -12 }, shadowOpacity: isDark ? 0.3 : 0.1, shadowRadius: 25,
    elevation: 30, zIndex: 10,
  },
  offlineCenter: { alignItems: 'center', marginBottom: 20 },
  offlineTitle: { fontSize: 22, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 6, letterSpacing: -0.5 },
  offlineSub: { fontSize: 13, fontWeight: '700', color: isDark ? '#94a3b8' : '#94a3b8', textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
  sliderTrack: {
    width: '100%', height: 72, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
    marginBottom: 24, paddingHorizontal: 4, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', overflow: 'hidden',
  },
  sliderHandle: {
    position: 'absolute', left: 4, width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 10, zIndex: 2,
  },
  earningsBadge: { 
    backgroundColor: '#10b981', color: 'white', fontSize: 10, fontWeight: '900', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden',
  },
});

export default getStyles;

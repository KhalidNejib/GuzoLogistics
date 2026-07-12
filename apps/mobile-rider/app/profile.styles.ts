import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0f172a' : '#f8fafc' },
  scroll: { flex: 1 },
  
  // Header
  headerContainer: { backgroundColor: isDark ? '#0f172a' : 'white', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingTop: 24, paddingBottom: 32, shadowColor: '#e2e8f0', shadowOffset: { width: 0, height: 10 }, shadowOpacity: isDark ? 0.3 : 0.5, shadowRadius: 20, borderBottomWidth: 1, borderBottomColor: isDark ? '#1e293b' : '#f1f5f9', alignItems: 'center', elevation: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, width: '100%', marginBottom: 16 },
  backBtn: { width: 44, height: 44, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9' },
  langToggle: { backgroundColor: isDark ? '#312e81' : '#f5f3ff', paddingHorizontal: 16, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#3730a3' : '#e0e7ff', flexDirection: 'row', gap: 8 },
  langText: { color: isDark ? '#a5b4fc' : '#4f46e5', fontWeight: '900', fontSize: 13 },
  
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatarWrapper: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: isDark ? '#312e81' : '#f5f3ff', padding: 4, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  avatar: { width: '100%', height: '100%', borderRadius: 50 },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4f46e5', padding: 8, borderRadius: 14, borderWidth: 3, borderColor: isDark ? '#0f172a' : 'white', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  
  profileInfo: { alignItems: 'center' },
  roleText: { color: isDark ? '#6366f1' : '#818cf8', fontWeight: '900', fontSize: 9, textTransform: 'uppercase', letterSpacing: 3, marginBottom: 4 },
  userName: { fontSize: 24, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a', letterSpacing: -0.5 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#064e3b' : '#f0fdf4', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginTop: 8, borderWidth: 1, borderColor: isDark ? '#059669' : '#dcfce7' },
  verifiedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 },
  verifiedText: { color: isDark ? '#34d399' : '#10b981', fontWeight: '900', fontSize: 8, textTransform: 'uppercase', letterSpacing: 1.2 },

  // Stats Card
  statsCard: { marginHorizontal: 20, marginTop: -24, backgroundColor: isDark ? '#1e293b' : 'white', borderRadius: 32, padding: 24, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, borderWidth: 1, borderColor: isDark ? '#334155' : '#eef2ff', elevation: 12 },
  balanceLabel: { color: isDark ? '#64748b' : '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 9, marginBottom: 4 },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  balanceText: { fontSize: 36, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a', letterSpacing: -1 },
  balanceUnit: { color: isDark ? '#818cf8' : '#6366f1', fontWeight: '900', fontSize: 12 },
  
  cashHeldCard: { backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: 20, borderRadius: 24, marginTop: 24, borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0' },
  cashLabel: { color: isDark ? '#64748b' : '#64748b', fontWeight: '900', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  cashValue: { color: isDark ? 'white' : '#0f172a', fontWeight: '900', fontSize: 16 },
  settleBtn: { backgroundColor: isDark ? '#4f46e5' : '#1e293b', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  settleText: { color: 'white', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 },
  
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: 16, borderRadius: 20, marginTop: 20, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9' },
  metricItem: { flex: 1, alignItems: 'center' },
  metricLabel: { color: isDark ? '#64748b' : '#64748b', fontWeight: '900', textTransform: 'uppercase', fontSize: 8, letterSpacing: 1, marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a' },
  metricDivider: { width: 1, height: 24, backgroundColor: isDark ? '#334155' : '#e2e8f0' },
  
  // Menu
  menuList: { paddingHorizontal: 20, marginTop: 32, gap: 12 },
  menuLabel: { color: isDark ? '#64748b' : '#94a3b8', fontWeight: '900', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, marginLeft: 16, marginBottom: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1e293b' : 'white', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10 },
  menuIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: isDark ? '#1e293b' : 'white' },
  menuTextContainer: { flex: 1 },
  menuItemTitle: { fontSize: 15, fontWeight: '900', color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: -0.3 },
  menuItemSub: { fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', fontWeight: '700', marginTop: 2 },
  chevron: { width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#0f172a' : '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  
  // Logout
  logoutBtn: { marginHorizontal: 20, marginTop: 40, backgroundColor: isDark ? '#1e293b' : 'white', paddingVertical: 18, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: isDark ? '#7f1d1d' : '#fee2e2', marginBottom: 60, shadowColor: '#ef4444', shadowOpacity: 0.05, shadowRadius: 15 },
  logoutContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoutText: { color: '#f43f5e', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5 },
  versionText: { color: isDark ? '#334155' : '#cbd5e1', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 4, textAlign: 'center', marginTop: 24 },
});

export default getStyles;

import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const premiumKit = StyleSheet.create({
  // Base Layouts
  safeArea: { flex: 1 },
  bgLight: { backgroundColor: '#f8fafc' },
  bgDark: { backgroundColor: '#020617' },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    backgroundColor: 'white'
  },
  headerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b'
  },
  headerLight: {
    backgroundColor: 'white',
    borderBottomColor: '#f1f5f9'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 16,
    color: '#0f172a',
    letterSpacing: -0.5
  },
  headerTitleDark: {
    color: 'white'
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Cards
  card: {
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  cardLight: {
    backgroundColor: 'white',
    borderColor: '#f1f5f9'
  },
  cardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b'
  },

  // Typography
  label: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 4
  },
  labelLight: { color: '#94a3b8' },
  labelDark: { color: '#64748b' },
  
  title: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  titleDark: { color: 'white' },
  subTitle: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
  subTitleDark: { color: '#94a3b8' },

  // List Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },

  // Accents
  accentBox: {
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1
  },
  accentBoxBlue: {
    backgroundColor: '#f0f9ff',
    borderColor: '#e0f2fe'
  }
});

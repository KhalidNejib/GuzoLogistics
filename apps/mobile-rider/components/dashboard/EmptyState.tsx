import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import getStyles from '../../app/index.styles';
import { settingService } from '../../services/settingService';

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    return settingService.subscribe(s => setIsDark(s.darkMode));
  }, []);

  const styles = getStyles(isDark);

  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon as any} size={48} color={isDark ? '#334155' : '#cbd5e1'} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

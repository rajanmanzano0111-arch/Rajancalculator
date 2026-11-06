import { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const KEYS = [
  ['AC', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['±', '0', '.', '='],
];

const OPERATORS = ['÷', '×', '−', '+'];

const TOP_SPACE =
  Platform.OS === 'web' ? 90 : Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : 0;

const THEMES = {
  dark: {
    background: '#1B2030',
    text: '#F3F1EC',
    subtext: '#7D869C',
    key: '#2A3145',
    utilityKey: '#3A435C',
    operatorKey: '#3B2F5C',
    operatorText: '#C9B8FF',
    equalsKey: '#F2B84B',
    equalsText: '#1B2030',
    panel: '#232A3D',
    border: '#343C54',
  },
  light: {
    background: '#F2F0EB',
    text: '#1B2030',
    subtext: '#6B7385',
    key: '#FFFFFF',
    utilityKey: '#DDE1EA',
    operatorKey: '#E6DEFA',
    operatorText: '#4B3A8F',
    equalsKey: '#F2B84B',
    equalsText: '#1B2030',
    panel: '#E7E4DD',
    border: '#D6D2C8',
  },
};

type HistoryItem = { id: number; expression: string; result: string };
type Styles = ReturnType<typeof createStyles>;

function compute(a: string, b: string, op: string): number | null {
  const x = parseFloat(a);
  const y = parseFloat(b);
  switch (op) {
    case '+': return x + y;
    case '−': return x - y;
    case '×': return x * y;
    case '÷': return y === 0 ? null : x / y;
    default: return y;
  }
}

function format(value: number | null): string {
  if (value === null) return 'Cannot divide by 0';
  if (!isFinite(value)) return 'Error';
  return String(parseFloat(value.toPrecision(12)));
}


type DisplayProps = {
  previous: string | null;
  operator: string | null;
  current: string;
  styles: Styles;
};

function Display({ previous, operator, current, styles }: DisplayProps) {
  const displaySize = current.length > 9 ? 40 : current.length > 6 ? 52 : 64;

  return (
    <View style={styles.display}>
      <Text style={styles.history} numberOfLines={1}>
        {previous !== null && operator ? `${previous} ${operator}` : ' '}
      </Text>
      <Text
        style={[styles.result, { fontSize: displaySize }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {current}
      </Text>
    </View>
  );
}


type CalcButtonProps = {
  label: string;
  onPress: (key: string) => void;
  buttonStyle: any;
  labelStyle: any;
};

function CalcButton({ label, onPress, buttonStyle, labelStyle }: CalcButtonProps) {
  return (
    <TouchableOpacity
      style={buttonStyle}
      activeOpacity={0.7}
      onPress={() => onPress(label)}
      accessibilityLabel={label}
    >
      <Text style={labelStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function Calculator() {
  const scheme = useColorScheme();
  const theme = scheme === 'light' ? THEMES.light : THEMES.dark;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [current, setCurrent] = useState('0');
  const [previous, setPrevious] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const reset = () => {
    setCurrent('0');
    setPrevious(null);
    setOperator(null);
    setOverwrite(false);
  };

  const inputDigit = (d: string) => {
    if (overwrite || current === '0' || current.startsWith('Cannot')) {
      setCurrent(d);
      setOverwrite(false);
    } else if (current.length < 12) {
      setCurrent(current + d);
    }
  };

  const inputDot = () => {
    if (overwrite) {
      setCurrent('0.');
      setOverwrite(false);
    } else if (!current.includes('.')) {
      setCurrent(current + '.');
    }
  };

  const addToHistory = (expression: string, result: string) => {
    setHistory((h) => [{ id: Date.now() + Math.random(), expression, result }, ...h]);
  };

  const chooseOperator = (op: string) => {
    if (operator && previous !== null && !overwrite) {
      const result = compute(previous, current, operator);
      if (result === null) {
        reset();
        setCurrent('Cannot divide by 0');
        return;
      }
      const formatted = format(result);
      addToHistory(`${previous} ${operator} ${current}`, formatted);
      setPrevious(formatted);
      setCurrent(formatted);
    } else {
      setPrevious(current);
    }
    setOperator(op);
    setOverwrite(true);
  };

  const equals = () => {
    if (!operator || previous === null) return;
    const result = compute(previous, current, operator);
    const formatted = format(result);

    if (result !== null) {
      addToHistory(`${previous} ${operator} ${current}`, formatted);
    }

    setCurrent(formatted);
    setPrevious(null);
    setOperator(null);
    setOverwrite(true);
  };

  const press = (key: string) => {
    if (/^\d$/.test(key)) return inputDigit(key);
    if (OPERATORS.includes(key)) return chooseOperator(key);

    switch (key) {
      case '.': return inputDot();
      case '=': return equals();
      case 'AC': return reset();
      case '⌫':
        if (overwrite) return;
        return setCurrent(current.length > 1 ? current.slice(0, -1) : '0');
      case '±':
        if (current !== '0') {
          setCurrent(current.startsWith('-') ? current.slice(1) : '-' + current);
        }
        return;
      case '%':
        return setCurrent(format(parseFloat(current) / 100));
    }
  };

  const selectResult = (item: HistoryItem) => {
    setCurrent(item.result);
    setPrevious(null);
    setOperator(null);
    setOverwrite(true);
    setShowHistory(false);
  };

  const keyStyle = (key: string) => {
    if (OPERATORS.includes(key)) return [styles.key, styles.operatorKey];
    if (key === '=') return [styles.key, styles.equalsKey];
    if (['AC', '⌫', '%', '±'].includes(key)) return [styles.key, styles.utilityKey];
    return styles.key;
  };

  const textStyle = (key: string) => {
    if (OPERATORS.includes(key)) return [styles.keyText, styles.operatorText];
    if (key === '=') return [styles.keyText, styles.equalsText];
    return styles.keyText;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={scheme === 'light' ? 'dark-content' : 'light-content'} />

      <View style={styles.calculator}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowHistory((s) => !s)}
            accessibilityLabel="Toggle history"
          >
            <Text style={styles.headerButtonText}>
              {showHistory ? 'Back to calculator' : `History (${history.length})`}
            </Text>
          </TouchableOpacity>

          {showHistory && history.length > 0 && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setHistory([])}
              accessibilityLabel="Clear history"
            >
              <Text style={styles.headerButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {showHistory ? (
          <View style={styles.historyPanel}>
            {history.length === 0 ? (
              <Text style={styles.emptyText}>
                No calculations yet. Try 2 + 3 and press = to save one here.
              </Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {history.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyItem}
                    onPress={() => selectResult(item)}
                  >
                    <Text style={styles.historyExpression}>{item.expression}</Text>
                    <Text style={styles.historyResult}>= {item.result}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <Display
            previous={previous}
            operator={operator}
            current={current}
            styles={styles}
          />
        )}

        <View style={styles.pad}>
          {KEYS.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map((key) => (
                <CalcButton
                  key={key}
                  label={key}
                  onPress={press}
                  buttonStyle={keyStyle(key)}
                  labelStyle={textStyle(key)}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (t: typeof THEMES.dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
      alignItems: 'center',
      paddingTop: TOP_SPACE,
    },
    calculator: {
      flex: 1,
      width: '100%',
      maxWidth: 380,
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 12,
      paddingBottom: 4,
    },
    headerButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: t.panel,
      borderWidth: 1,
      borderColor: t.border,
    },
    headerButtonText: {
      color: t.text,
      fontSize: 15,
      fontWeight: '500',
    },
    display: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      paddingHorizontal: 8,
      paddingBottom: 16,
    },
    history: {
      color: t.subtext,
      fontSize: 20,
      marginBottom: 4,
    },
    result: {
      color: t.text,
      fontWeight: '300',
    },
    historyPanel: {
      flex: 1,
      marginVertical: 12,
      borderRadius: 20,
      backgroundColor: t.panel,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    emptyText: {
      color: t.subtext,
      fontSize: 16,
      textAlign: 'center',
      marginTop: 40,
    },
    historyItem: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
      alignItems: 'flex-end',
    },
    historyExpression: {
      color: t.subtext,
      fontSize: 16,
    },
    historyResult: {
      color: t.text,
      fontSize: 26,
      fontWeight: '300',
    },
    pad: {
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    key: {
      flex: 1,
      height: 72,
      borderRadius: 20,
      backgroundColor: t.key,
      alignItems: 'center',
      justifyContent: 'center',
    },
    utilityKey: {
      backgroundColor: t.utilityKey,
    },
    operatorKey: {
      backgroundColor: t.operatorKey,
    },
    equalsKey: {
      backgroundColor: t.equalsKey,
    },
    keyText: {
      color: t.text,
      fontSize: 26,
      fontWeight: '400',
    },
    operatorText: {
      color: t.operatorText,
      fontSize: 30,
    },
    equalsText: {
      color: t.equalsText,
      fontSize: 30,
      fontWeight: '600',
    },
  });
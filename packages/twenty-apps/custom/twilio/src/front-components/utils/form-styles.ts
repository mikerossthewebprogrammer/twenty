const COLOR = {
  text: '#333333',
  secondary: '#666666',
  border: '#ebebeb',
  accent: '#1961ed',
  muted: '#d6d6d6',
};

const BUTTON = {
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '13px',
  padding: '6px 14px',
};

export const FORM_STYLES = {
  container: {
    boxSizing: 'border-box' as const,
    color: COLOR.text,
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    gap: '12px',
    padding: '16px',
  },
  label: {
    color: COLOR.secondary,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  input: {
    border: `1px solid ${COLOR.border}`,
    borderRadius: '6px',
    boxSizing: 'border-box' as const,
    color: COLOR.text,
    fontFamily: 'inherit',
    fontSize: '14px',
    padding: '8px',
    width: '100%',
  },
  hint: {
    color: COLOR.secondary,
    lineHeight: '18px',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  primaryButton: { ...BUTTON, background: COLOR.accent, color: '#ffffff' },
  secondaryButton: {
    ...BUTTON,
    background: 'transparent',
    border: `1px solid ${COLOR.border}`,
    color: COLOR.text,
  },
  disabledButton: {
    ...BUTTON,
    background: COLOR.muted,
    color: '#ffffff',
    cursor: 'not-allowed',
  },
  error: {
    color: '#e05252',
    margin: 0,
  },
  choices: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
  },
  choice: {
    ...BUTTON,
    background: 'transparent',
    border: `1px solid ${COLOR.border}`,
    color: COLOR.text,
  },
  selectedChoice: {
    ...BUTTON,
    background: '#ebf1fd',
    border: `1px solid ${COLOR.accent}`,
    color: COLOR.accent,
  },
};

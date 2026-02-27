import { describe, it, expect } from 'vitest';

// ─── Rules route logic ──────────────────────────────────────────────────────
describe('Automation Rules validation', () => {
  const validateRule = (body) => {
    const required = ['module_id', 'name', 'trigger_type', 'trigger_config', 'action_type'];
    const missing = required.filter(f => !body[f]);
    return missing.length === 0 ? null : `Missing required fields`;
  };

  it('passes when all required fields present', () => {
    expect(validateRule({
      module_id: 'content',
      name: 'Daily Post',
      trigger_type: 'schedule',
      trigger_config: { frequency: 'daily' },
      action_type: 'publish',
    })).toBeNull();
  });

  it('fails when missing module_id', () => {
    expect(validateRule({
      name: 'Daily Post',
      trigger_type: 'schedule',
      trigger_config: { frequency: 'daily' },
      action_type: 'publish',
    })).toBe('Missing required fields');
  });

  it('fails when missing trigger_config', () => {
    expect(validateRule({
      module_id: 'content',
      name: 'Daily Post',
      trigger_type: 'schedule',
      action_type: 'publish',
    })).toBe('Missing required fields');
  });

  describe('update field filtering', () => {
    const allowedFields = ['name', 'trigger_type', 'action_type', 'requires_approval', 'status', 'module_id'];
    const jsonFields = ['trigger_config', 'action_config'];

    const filterUpdateFields = (body) => {
      const fields = [];
      for (const key of allowedFields) {
        if (body[key] !== undefined) fields.push(key);
      }
      for (const key of jsonFields) {
        if (body[key] !== undefined) fields.push(key);
      }
      return fields;
    };

    it('extracts only allowed fields from body', () => {
      const fields = filterUpdateFields({ name: 'New Name', status: 'inactive', hacker: 'drop table' });
      expect(fields).toContain('name');
      expect(fields).toContain('status');
      expect(fields).not.toContain('hacker');
    });

    it('includes JSON config fields', () => {
      const fields = filterUpdateFields({ trigger_config: { cron: '0 9 * * *' } });
      expect(fields).toContain('trigger_config');
    });

    it('returns empty for no valid fields', () => {
      expect(filterUpdateFields({ unknown: 'value' })).toHaveLength(0);
    });
  });

  describe('requires_approval coercion', () => {
    const coerce = (val) => val ? 1 : 0;
    it('coerces true to 1', () => expect(coerce(true)).toBe(1));
    it('coerces false to 0', () => expect(coerce(false)).toBe(0));
    it('coerces undefined/null to 0', () => {
      expect(coerce(undefined)).toBe(0);
      expect(coerce(null)).toBe(0);
    });
  });
});

// ─── Notifications route logic ──────────────────────────────────────────────
describe('Notifications logic', () => {
  describe('unread count calculation', () => {
    const calcUnread = (items) => items.filter(n => !n.read).length;

    it('counts unread notifications', () => {
      const items = [
        { id: 1, read: false },
        { id: 2, read: true },
        { id: 3, read: false },
      ];
      expect(calcUnread(items)).toBe(2);
    });

    it('returns 0 when all read', () => {
      expect(calcUnread([{ id: 1, read: true }])).toBe(0);
    });

    it('handles empty array', () => {
      expect(calcUnread([])).toBe(0);
    });
  });

  describe('read boolean coercion from SQLite', () => {
    const coerceRead = (row) => ({ ...row, read: !!row.read });

    it('converts 0 to false', () => {
      expect(coerceRead({ id: 1, read: 0 }).read).toBe(false);
    });

    it('converts 1 to true', () => {
      expect(coerceRead({ id: 1, read: 1 }).read).toBe(true);
    });
  });
});

// ─── Settings route logic ────────────────────────────────────────────────────
describe('Automation Settings', () => {
  const DEFAULTS = {
    pauseAll: 'false',
    defaultMode: 'manual',
    maxActionsPerDay: '50',
    maxActionsPerHour: '10',
    monthlyBudgetLimit: '0',
    confidenceThreshold: '70',
    notifyNewSuggestions: 'true',
    notifyCompletedActions: 'true',
    notifyFailedActions: 'true',
    notifyRuleTriggers: 'true',
    riskLevel: 'balanced',
    previousModes: '{}',
  };

  describe('defaults merging', () => {
    const mergeSettings = (dbRows) => {
      const result = { ...DEFAULTS };
      for (const row of dbRows) result[row.key] = row.value;
      return result;
    };

    it('returns all defaults when DB is empty', () => {
      const settings = mergeSettings([]);
      expect(settings.pauseAll).toBe('false');
      expect(settings.defaultMode).toBe('manual');
      expect(settings.riskLevel).toBe('balanced');
      expect(Object.keys(settings)).toHaveLength(12);
    });

    it('overrides defaults with DB values', () => {
      const settings = mergeSettings([
        { key: 'pauseAll', value: 'true' },
        { key: 'riskLevel', value: 'aggressive' },
      ]);
      expect(settings.pauseAll).toBe('true');
      expect(settings.riskLevel).toBe('aggressive');
      expect(settings.defaultMode).toBe('manual'); // unchanged default
    });
  });

  describe('key validation on write', () => {
    const isValidKey = (key) => DEFAULTS.hasOwnProperty(key);

    it('accepts known keys', () => {
      expect(isValidKey('pauseAll')).toBe(true);
      expect(isValidKey('riskLevel')).toBe(true);
      expect(isValidKey('confidenceThreshold')).toBe(true);
    });

    it('rejects unknown keys', () => {
      expect(isValidKey('hackerField')).toBe(false);
      expect(isValidKey('__proto__')).toBe(false);
      expect(isValidKey('')).toBe(false);
    });
  });

  describe('value serialization', () => {
    it('converts all values to strings', () => {
      expect(String(true)).toBe('true');
      expect(String(50)).toBe('50');
      expect(String('balanced')).toBe('balanced');
    });
  });
});

// ─── Activity Log route logic ────────────────────────────────────────────────
describe('Activity Log', () => {
  describe('filter SQL construction', () => {
    const buildFilters = ({ module, status, dateFrom, dateTo }) => {
      let where = ' WHERE 1=1';
      const params = [];
      if (module) { where += ' AND module_id = ?'; params.push(module); }
      if (status) { where += ' AND status = ?'; params.push(status); }
      if (dateFrom) { where += " AND date(created_at) >= ?"; params.push(dateFrom); }
      if (dateTo) { where += " AND date(created_at) <= ?"; params.push(dateTo); }
      return { where, params };
    };

    it('returns base WHERE with no filters', () => {
      const { where, params } = buildFilters({});
      expect(where).toBe(' WHERE 1=1');
      expect(params).toHaveLength(0);
    });

    it('adds module filter', () => {
      const { where, params } = buildFilters({ module: 'content' });
      expect(where).toContain('module_id = ?');
      expect(params).toEqual(['content']);
    });

    it('combines multiple filters', () => {
      const { where, params } = buildFilters({ module: 'ads', status: 'completed', dateFrom: '2025-01-01' });
      expect(where).toContain('module_id = ?');
      expect(where).toContain('status = ?');
      expect(where).toContain('date(created_at) >= ?');
      expect(params).toHaveLength(3);
    });
  });

  describe('stats calculations', () => {
    const calcSuccessRate = (total, completed) =>
      total > 0 ? Math.round((completed / total) * 100) : 0;

    it('computes correct success rate', () => {
      expect(calcSuccessRate(10, 8)).toBe(80);
      expect(calcSuccessRate(3, 3)).toBe(100);
      expect(calcSuccessRate(100, 72)).toBe(72);
    });

    it('returns 0 when no actions', () => {
      expect(calcSuccessRate(0, 0)).toBe(0);
    });

    it('rounds correctly', () => {
      expect(calcSuccessRate(3, 2)).toBe(67);
    });
  });

  describe('JSON data parsing', () => {
    const parseRowData = (row) => ({
      ...row,
      input_data: row.input_data ? JSON.parse(row.input_data) : null,
      output_data: row.output_data ? JSON.parse(row.output_data) : null,
    });

    it('parses valid JSON fields', () => {
      const result = parseRowData({
        id: 1,
        input_data: '{"prompt":"test"}',
        output_data: '{"result":"done"}',
      });
      expect(result.input_data).toEqual({ prompt: 'test' });
      expect(result.output_data).toEqual({ result: 'done' });
    });

    it('returns null for missing data', () => {
      const result = parseRowData({ id: 1, input_data: null, output_data: null });
      expect(result.input_data).toBeNull();
      expect(result.output_data).toBeNull();
    });
  });
});

// ─── Insights route logic ────────────────────────────────────────────────────
describe('AI Insights', () => {
  const MODULE_CATEGORY_MAP = {
    analytics: 'analytics',
    calendar: 'planning',
    competitors: 'analytics',
    crm: 'analytics',
    funnels: 'planning',
    integrations: 'connect',
    'ecommerce-hub': 'ecommerce',
    'ab-testing': 'testing',
  };

  const INSIGHT_TEMPLATES = {
    analytics: [
      { type: 'trend', text: 'Traffic spike detected', detail: 'Organic growth' },
      { type: 'recommendation', text: 'Schedule content for peak hours', detail: 'Based on historical data' },
    ],
    connect: [
      { type: 'dependency', text: '3 automations depend on this', detail: 'Cross-module reference' },
    ],
    default: [
      { type: 'dependency', text: 'This module connects to the automation ecosystem', detail: 'Enable copilot' },
    ],
  };

  const getInsights = (moduleId) => {
    const category = MODULE_CATEGORY_MAP[moduleId] || 'default';
    return INSIGHT_TEMPLATES[category] || INSIGHT_TEMPLATES.default;
  };

  it('returns category-specific insights for known modules', () => {
    const items = getInsights('analytics');
    expect(items).toHaveLength(2);
    expect(items[0].type).toBe('trend');
  });

  it('returns connect insights for integration modules', () => {
    const items = getInsights('integrations');
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('dependency');
  });

  it('falls back to default for unknown modules', () => {
    const items = getInsights('unknown-module');
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('dependency');
  });

  it('falls back to default for unmapped categories', () => {
    const items = getInsights('some-new-module');
    expect(items[0].text).toContain('automation ecosystem');
  });

  describe('category mapping coverage', () => {
    it('maps analytics modules correctly', () => {
      expect(MODULE_CATEGORY_MAP['analytics']).toBe('analytics');
      expect(MODULE_CATEGORY_MAP['competitors']).toBe('analytics');
      expect(MODULE_CATEGORY_MAP['crm']).toBe('analytics');
    });

    it('maps planning modules correctly', () => {
      expect(MODULE_CATEGORY_MAP['calendar']).toBe('planning');
      expect(MODULE_CATEGORY_MAP['funnels']).toBe('planning');
    });

    it('maps ecommerce modules correctly', () => {
      expect(MODULE_CATEGORY_MAP['ecommerce-hub']).toBe('ecommerce');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { MODULE_REGISTRY, CATEGORIES, getModulesByCategory } from './modules';

describe('MODULE_REGISTRY', () => {
  it('has the correct number of modules', () => {
    expect(MODULE_REGISTRY.length).toBeGreaterThanOrEqual(35);
    expect(MODULE_REGISTRY.length).toBeLessThanOrEqual(40);
  });

  it('every module has required fields', () => {
    for (const mod of MODULE_REGISTRY) {
      expect(mod).toHaveProperty('id');
      expect(mod).toHaveProperty('name');
      expect(mod).toHaveProperty('description');
      expect(mod).toHaveProperty('path');
      expect(mod).toHaveProperty('icon');
      expect(mod).toHaveProperty('color');
      expect(mod).toHaveProperty('category');
      expect(typeof mod.id).toBe('string');
      expect(typeof mod.name).toBe('string');
      expect(mod.path).toMatch(/^\//);
      expect(mod.color).toMatch(/^#/);
    }
  });

  it('has unique IDs', () => {
    const ids = MODULE_REGISTRY.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique paths', () => {
    const paths = MODULE_REGISTRY.map(m => m.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('does not contain removed modules', () => {
    const ids = MODULE_REGISTRY.map(m => m.id);
    expect(ids).not.toContain('chatbot');
    expect(ids).not.toContain('support-center');
    expect(ids).not.toContain('brand-strategy');
    expect(ids).not.toContain('brand-profile');
    expect(ids).not.toContain('customer-intelligence');
    expect(ids).not.toContain('checkout-optimizer');
    expect(ids).not.toContain('profit-dashboard');
    expect(ids).not.toContain('billing');
  });

  it('contains the merged modules', () => {
    const ids = MODULE_REGISTRY.map(m => m.id);
    expect(ids).toContain('customer-ai');
    expect(ids).toContain('brand-hub');
  });

  it('every module belongs to a valid category', () => {
    const catIds = CATEGORIES.map(c => c.id);
    for (const mod of MODULE_REGISTRY) {
      expect(catIds).toContain(mod.category);
    }
  });
});

describe('CATEGORIES', () => {
  it('has 7 categories', () => {
    expect(CATEGORIES).toHaveLength(7);
  });

  it('every category has required fields', () => {
    for (const cat of CATEGORIES) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('label');
      expect(cat).toHaveProperty('color');
      expect(cat).toHaveProperty('icon');
    }
  });
});

describe('getModulesByCategory', () => {
  it('returns modules for a valid category', () => {
    const createMods = getModulesByCategory('create');
    expect(createMods.length).toBeGreaterThan(0);
    createMods.forEach(m => expect(m.category).toBe('create'));
  });

  it('returns empty array for invalid category', () => {
    expect(getModulesByCategory('nonexistent')).toEqual([]);
  });
});

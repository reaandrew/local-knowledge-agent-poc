const featureModule = require('../features');

describe('Feature Toggles', () => {
  describe('features object', () => {
    it('should define feature flags with boolean values', () => {
      const { features } = featureModule;
      
      expect(features).toBeDefined();
      expect(features.CHAT_INTERFACE).toBeDefined();
      expect(typeof features.CHAT_INTERFACE).toBe('boolean');
      expect(features.SETTINGS_PANEL).toBeDefined();
      expect(typeof features.SETTINGS_PANEL).toBe('boolean');
      expect(features.LOCAL_LLM).toBeDefined();
      expect(typeof features.LOCAL_LLM).toBe('boolean');
      expect(features.MODEL_DOWNLOAD).toBeDefined();
      expect(typeof features.MODEL_DOWNLOAD).toBe('boolean');
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return false for unknown features', () => {
      const { isFeatureEnabled } = featureModule;
      expect(isFeatureEnabled('UNKNOWN_FEATURE')).toBe(false);
    });

    it('should return the correct value for known features', () => {
      const { isFeatureEnabled, features } = featureModule;
      
      // Save original value
      const originalValue = features.CHAT_INTERFACE;
      
      // Test with feature disabled
      features.CHAT_INTERFACE = false;
      expect(isFeatureEnabled('CHAT_INTERFACE')).toBe(false);
      
      // Test with feature enabled
      features.CHAT_INTERFACE = true;
      expect(isFeatureEnabled('CHAT_INTERFACE')).toBe(true);
      
      // Restore original value
      features.CHAT_INTERFACE = originalValue;
    });
  });

  describe('enableFeature', () => {
    it('should enable a valid feature', () => {
      const { enableFeature, features } = featureModule;
      
      // Save original value
      const originalValue = features.SETTINGS_PANEL;
      
      // Test enabling the feature
      features.SETTINGS_PANEL = false;
      enableFeature('SETTINGS_PANEL');
      expect(features.SETTINGS_PANEL).toBe(true);
      
      // Restore original value
      features.SETTINGS_PANEL = originalValue;
    });

    it('should do nothing for unknown features', () => {
      const { enableFeature } = featureModule;
      
      // Should not throw an error
      expect(() => enableFeature('UNKNOWN_FEATURE')).not.toThrow();
    });
  });

  describe('disableFeature', () => {
    it('should disable a valid feature', () => {
      const { disableFeature, features } = featureModule;
      
      // Save original value
      const originalValue = features.LOCAL_LLM;
      
      // Test disabling the feature
      features.LOCAL_LLM = true;
      disableFeature('LOCAL_LLM');
      expect(features.LOCAL_LLM).toBe(false);
      
      // Restore original value
      features.LOCAL_LLM = originalValue;
    });

    it('should do nothing for unknown features', () => {
      const { disableFeature } = featureModule;
      
      // Should not throw an error
      expect(() => disableFeature('UNKNOWN_FEATURE')).not.toThrow();
    });
  });
}); 
import { LinkedInAdapter } from '../adapters/LinkedInAdapter';
import { GlassdoorAdapter } from '../adapters/GlassdoorAdapter';
import { FieldMappingService } from '../field-mapping/FieldMappingService';

describe('Platform Adapters', () => {
  let fieldMapper: FieldMappingService;

  beforeEach(() => {
    fieldMapper = new FieldMappingService();
  });

  describe('LinkedInAdapter', () => {
    let adapter: LinkedInAdapter;

    beforeEach(() => {
      adapter = new LinkedInAdapter(fieldMapper);
    });

    it('should have correct platform name', () => {
      expect(adapter.platformName).toBe('linkedin');
    });

    it('should implement IPlatformAdapter interface', () => {
      expect(typeof adapter.isOnPlatform).toBe('function');
      expect(typeof adapter.detectApplicationForm).toBe('function');
      expect(typeof adapter.detectFields).toBe('function');
      expect(typeof adapter.fillField).toBe('function');
      expect(typeof adapter.uploadResume).toBe('function');
      expect(typeof adapter.navigateToNextStep).toBe('function');
      expect(typeof adapter.submitApplication).toBe('function');
      expect(typeof adapter.isApplicationComplete).toBe('function');
      expect(typeof adapter.handlePopups).toBe('function');
    });

    it('should have LinkedIn-specific methods', () => {
      expect(typeof adapter.openEasyApply).toBe('function');
      expect(typeof adapter.closeModal).toBe('function');
      expect(typeof adapter.hasErrors).toBe('function');
    });
  });

  describe('GlassdoorAdapter', () => {
    let adapter: GlassdoorAdapter;

    beforeEach(() => {
      adapter = new GlassdoorAdapter(fieldMapper);
    });

    it('should have correct platform name', () => {
      expect(adapter.platformName).toBe('glassdoor');
    });

    it('should implement IPlatformAdapter interface', () => {
      expect(typeof adapter.isOnPlatform).toBe('function');
      expect(typeof adapter.detectApplicationForm).toBe('function');
      expect(typeof adapter.detectFields).toBe('function');
      expect(typeof adapter.fillField).toBe('function');
      expect(typeof adapter.uploadResume).toBe('function');
      expect(typeof adapter.navigateToNextStep).toBe('function');
      expect(typeof adapter.submitApplication).toBe('function');
      expect(typeof adapter.isApplicationComplete).toBe('function');
      expect(typeof adapter.handlePopups).toBe('function');
    });

    it('should have Glassdoor-specific methods', () => {
      expect(typeof adapter.openApplication).toBe('function');
      expect(typeof adapter.isExternalRedirect).toBe('function');
      expect(typeof adapter.closeModal).toBe('function');
      expect(typeof adapter.hasErrors).toBe('function');
    });
  });
});

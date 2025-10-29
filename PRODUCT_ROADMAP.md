# Product Roadmap & Multi-Club Strategy

## Vision

Transform the LMRC Booking Viewer into a **commercial product** that can be deployed to multiple rowing clubs as a turnkey solution.

## Target Market

- Rowing clubs using RevolutioniseSport for boat bookings
- Clubs wanting professional digital displays for noticeboards and booking viewers
- Non-technical club administrators who need simple setup

## Product Offering (Future)

### Hardware
- Pre-configured Raspberry Pi devices
- Ready to connect to customer TVs
- Multiple devices per club:
  - Noticeboard display(s)
  - Booking viewer display(s)

### Software Components
1. **Booking Viewer** (this repository)
   - TV display mode for boat bookings
   - Web interface for configuration

2. **Digital Noticeboard** (separate repository)
   - Dynamic content display
   - Image and event management

3. **Boat Booking Page** (separate project)
   - Customer-facing booking interface
   - Integration with RevSport backend

## Critical Requirements for Multi-Club Deployment

### 1. Startup Wizard (HIGH PRIORITY)

**Problem**: Non-technical club administrators need to configure Raspberry Pis without SSH or command-line access.

**Solution Requirements**:
- **Initial Setup Flow**:
  - Connect to Pi via web browser (e.g., http://raspberrypi.local:8080)
  - Wizard-driven configuration (no technical knowledge required)
  - Step-by-step guidance with validation

- **Configuration Items**:
  - Club information (name, logo URL)
  - RevSport credentials (username, password)
  - WiFi network setup
  - Display preferences (which app on which Pi)
  - Timezone and locale settings

- **Architecture Considerations**:
  - Captive portal on first boot (before network configuration)
  - Persistent configuration storage (survives reboots)
  - Configuration validation and testing
  - Rollback capability if configuration fails

### 2. Multi-Tenancy Architecture

**Current State**:
- Single club (LMRC) hardcoded in various places
- Credentials in environment variables
- Single deployment per Pi

**Future State Needed**:
- **Configuration Isolation**: Each club's config completely separate
- **Credential Management**: Secure storage of per-club RevSport credentials
- **Branding Customization**: Per-club logos, colors, club names
- **Data Isolation**: Separate caches per club (if running multiple clubs on same infrastructure)

**Key Design Principles**:
- ✅ **Already Good**: Configuration in files (config.json, tv-display.json)
- ✅ **Already Good**: Logo URL configurable (not hardcoded)
- ⚠️ **Needs Work**: Credentials in .env file (need secure vault or wizard storage)
- ⚠️ **Needs Work**: Club name in multiple places (should be centralized)

### 3. Zero-Touch Deployment

**Goal**: Ship pre-configured Pis that "just work" when plugged in

**Requirements**:
- SD card images with all software pre-installed
- Boot to setup wizard on first start
- Auto-update mechanism for software updates
- Remote diagnostics capability (opt-in)
- Factory reset option for re-deployment

### 4. Configuration Management

**Current**:
- Manual file editing
- Git-based updates
- Command-line deployment

**Needed**:
- Web-based configuration UI (already started with config.html)
- Configuration backup/restore
- Configuration templates for common setups
- Import/export for migrating between devices

### 5. Support & Monitoring

**Future Considerations**:
- Health check dashboard (accessible to support team)
- Remote log access (with customer permission)
- Automated error reporting
- Software update notifications
- License/subscription management

## Architecture Evolution Path

### Phase 1: Current (v1.0.0) ✅
- Single club deployment
- Manual configuration
- Git-based updates
- Working production system at LMRC

### Phase 2: Configuration Wizard (Next Major Version)
- Web-based setup wizard
- Simplified configuration UI
- WiFi setup interface
- Credential storage (encrypted)
- No command-line required

### Phase 3: Multi-Club Ready
- Per-club configuration profiles
- Centralized club information management
- Template-based deployment
- Configuration export/import
- Factory reset capability

### Phase 4: Commercial Product
- SD card image generator (per-club)
- Remote management portal (for support)
- Automated updates with rollback
- Customer portal for self-service configuration
- Usage analytics (opt-in)
- Subscription/licensing system

## Technical Debt to Address

### Before Multi-Club Deployment

1. **Centralize Club Configuration**
   - Create single source of truth for club info
   - Current: Club name scattered across multiple files
   - Future: Single config file with club profile

2. **Secure Credential Storage**
   - Current: .env file with plaintext credentials
   - Future: Encrypted credential vault
   - Wizard should store credentials securely
   - Consider using system keyring or encrypted files

3. **Environment Detection**
   - Auto-detect if configuration exists
   - Boot to wizard if not configured
   - Normal operation if configured

4. **Configuration Schema Versioning**
   - Add version field to all config files
   - Migration scripts for config upgrades
   - Backward compatibility handling

5. **Error Recovery**
   - Graceful handling of invalid credentials
   - Clear error messages for end users
   - Automatic retry with backoff
   - Fallback to safe defaults

## Dependencies Between Projects

### Integration Points

1. **Booking Viewer** (this repository)
   - Needs RevSport credentials (per club)
   - Needs club branding (logo, name, colors)
   - Outputs TV display

2. **Digital Noticeboard** (separate repository)
   - Needs club branding
   - Needs content management
   - Outputs TV display

3. **Boat Booking Page** (separate project)
   - Needs RevSport integration
   - Needs club branding
   - Web interface for members

### Shared Components Needed

- **Common Configuration Library**
  - Shared club profile schema
  - Shared credential management
  - Shared branding configuration

- **Setup Wizard Framework**
  - Reusable across all applications
  - Modular steps (add/remove as needed)
  - Consistent UX across products

- **Deployment Scripts**
  - SD card image builder
  - Configuration injector
  - Update mechanism

## Design Guidelines for Future Work

### When Adding Features

**Always Consider**:
1. ✅ **Multi-club**: Will this work for multiple clubs?
2. ✅ **Configuration**: Can this be configured without code changes?
3. ✅ **Wizard-friendly**: Can a non-technical user configure this?
4. ✅ **Documentation**: Is this documented for end users?
5. ✅ **Defaults**: Does this have sensible defaults?

**Avoid**:
- ❌ Hardcoding club-specific values
- ❌ Requiring command-line access
- ❌ Technical configuration steps
- ❌ Assumptions about deployment environment

### Configuration Best Practices

**DO**:
- ✅ Store configuration in JSON files (easy to edit, validate)
- ✅ Provide UI for all configuration options
- ✅ Use sensible defaults
- ✅ Validate configuration before applying
- ✅ Show previews of configuration changes
- ✅ Allow configuration testing

**DON'T**:
- ❌ Require editing code files
- ❌ Store secrets in plain text
- ❌ Assume network topology
- ❌ Hard-code file paths
- ❌ Require restart for config changes (when possible)

## Market Research Notes

### Potential Customers

- Rowing clubs using RevSport (primary target)
- Size range: 50-500 members
- Technical capability: Low to medium
- Budget: Variable (need tiered pricing)

### Competitive Advantages

1. **Turnkey Solution**: Ship configured hardware
2. **No IT Required**: Web-based setup
3. **RevSport Integration**: Native compatibility
4. **Professional Display**: Purpose-built for rowing clubs
5. **Support Included**: Managed updates and troubleshooting

### Pricing Considerations (Future)

- Hardware cost (Pi, case, cables, SD card)
- Software licensing (one-time or subscription?)
- Support tier options
- Setup/configuration service
- Custom development for special requirements

## Next Steps (When Ready)

### Immediate (Next 6 months)
1. Design setup wizard UX flow
2. Create wizard prototype
3. Implement secure credential storage
4. Centralize club configuration
5. Test with second club (pilot customer)

### Medium-term (6-12 months)
1. Multi-club deployment testing
2. SD card image builder
3. Remote management portal (basic)
4. Customer documentation
5. Pricing and business model

### Long-term (12+ months)
1. Customer portal for self-service
2. Usage analytics
3. Licensing system
4. Automated support tools
5. Partner/reseller program

## Notes

- Keep all code club-agnostic
- Design for configuration over customization
- Think "product" not "project"
- Prioritize user experience for non-technical users
- Build for scalability from the start
- Document everything for future product team

---

**Last Updated**: 2025-10-29
**Status**: Roadmap / Vision
**Priority**: Future (post v1.0.0)

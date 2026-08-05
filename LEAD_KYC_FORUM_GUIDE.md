# Lead KYC & Private Forum Integration Guide

## Overview
This system adds two major features to each lead:
1. **Private KYC Forum** - Collect detailed lead information
2. **Private Communication Channel** - Share links with external parties

## Features Implemented

### 1. KYC (Know Your Customer) Information
- Personal details (email, designation, education)
- Family information (marital status, spouse, mother, dependents)
- Work experience (current company, total experience)
- Address information (permanent, current, company)
- References (relatives and friends with contact details)
- All data is stored in MongoDB and linked to the lead

### 2. Private Forum Communication
- Each lead has a private forum automatically created
- Forum link can be **shared** or **not shared**
- **Not Shared**: Forum exists but link is inaccessible
- **Shared**: External parties can access using unique token
- **Unshare**: Revoke access individually or globally
- Internal team can add messages anytime
- External users can view messages (read-only in public view)

## Backend Endpoints

### KYC Endpoints
```
GET    /api/kyc/:leadId           - Get KYC data
PUT    /api/kyc/:leadId           - Update KYC data
POST   /api/kyc/:leadId/references    - Add reference
DELETE /api/kyc/:leadId/references/:referenceId - Remove reference
```

### Forum Endpoints
```
GET    /api/forum/:leadId         - Get forum (internal)
POST   /api/forum/:leadId/share   - Share with emails
POST   /api/forum/:leadId/unshare - Revoke access for email
POST   /api/forum/:leadId/revoke-all - Revoke all access
POST   /api/forum/:leadId/messages - Add message
GET    /api/forum/public/:token   - Get forum (public link)
```

## Frontend Integration

### In Lead Detail Modal/Page, add tabs:

```jsx
<Tabs>
  <Tab label="KYC Information">
    <KYCForm lead={lead} onSave={onRefresh} />
  </Tab>
  
  <Tab label="Private Forum">
    <ForumCommunication lead={lead} user={currentUser} />
  </Tab>
</Tabs>
```

### Import components:
```jsx
import KYCForm from "../components/KYCForm";
import ForumCommunication from "../components/ForumCommunication";
```

## Database Models

### KYC Schema
- leadId (ref to Lead)
- personalEmail, officialEmail
- designation, education
- maritalStatus, spouseName, motherName
- numberOfDependents
- workExperienceCurrentCompany, totalWorkExperience
- yearsAtCurrentAddress, yearsInCurrentCity
- currentAddressType (owned/rented)
- Permanent/Current/Company addresses with landmarks
- references[] (with name, contact, type, relationship)
- timestamps

### Forum Schema
- leadId (ref to Lead)
- uniqueToken (for sharing)
- isShared (boolean)
- sharedWith[] (array of {email, name, accessGrantedAt})
- internalParticipants[], externalParticipants[]
- messages[] (with sender, role, message, timestamp, attachment)

## User Workflows

### Admin/Sales Manager:
1. Open a lead
2. Go to **KYC Information** tab
3. Fill in all details about the lead
4. Save - data is stored in database

### Sharing Forum with Lead/Customer:
1. Open lead
2. Go to **Private Forum** tab
3. Click "Share with Email"
4. Enter customer email
5. Share link appears - can copy or send directly
6. Can add messages for communication
7. Customer can access with shared link

### Customer/External Party:
1. Receives shared link
2. Visits `/forum/[token]`
3. Enters their name
4. Can view all messages (read-only)
5. Cannot see internal messages - only forum owner sees them

### Revoking Access:
1. Click "Revoke" next to specific email
2. Or "Revoke All Access" to unshare with everyone
3. Link becomes inaccessible immediately

## Field Details

### KYC Form Sections:

**Personal Information**
- Name (auto-filled from CRM)
- Phone (auto-filled from CRM)
- Personal Email * (required)
- Official Email (with "same as personal" checkbox)

**Education & Designation**
- Education * (required)
- Designation * (required - dropdown from settings)

**Family Information**
- Marital Status * (single, married, divorced, widowed)
- Spouse Name (appears if married)
- Mother Name * (required)
- Number of Dependents (optional)

**Work Experience**
- Work Experience in Current Company * (required)
- Total Work Experience * (required)
- Years at Current Address * (required)
- Years in Current City * (required)

**Address Information**
- Permanent Address * (with STD code & mobile)
- Permanent Landmark * (required)
- Current Address Type * (owned/rented)
- Current Address (optional if same as permanent)
- Current Landmark (optional if same as permanent)
- Company Address * (required)
- Company Landmark (optional)

**References**
- Type: Relative or Friend
- Name * (required)
- Contact * (phone or email, required)
- Relationship/Notes
- Address (for relatives)

## Integration with Settings

Add to Settings page:
```jsx
// Designations dropdown options
addDesignation: (name) => api.post("/settings/designations", { name })
```

Add to Backend Settings:
```js
// settings schema
designations: [{ name: "Manager", active: true }, ...]
loanOfficer: { name: "Officer Name", contact: "number" }
```

## Data Flow

```
Lead Detail Page
    ↓
┌───┴────────────────┐
│                    │
KYC Form          Forum Communication
│                    │
Save → KYC Model   Share → Forum Model
│                    │
Stored in DB    External Link
│                    │
Display in form  Public Page
```

## Security Notes

- KYC data is private - only internal users can see
- Forum links are token-based and revocable
- Public forum shows only messages (not internal metadata)
- Visitors enter name but no authentication needed
- Add admin approval for sharing if needed

## Future Enhancements

1. Bulk KYC import from CSV
2. KYC template validation
3. Forum message encryption
4. File attachments in forum
5. Email notifications
6. KYC completion percentage
7. Expiring shares (auto-revoke after X days)
8. Two-way communication in public forum

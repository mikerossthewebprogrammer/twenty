import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { PERSON_SMS_OPTED_OUT_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_SMS_OPTED_OUT_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.BOOLEAN,
  name: 'smsOptedOut',
  label: 'SMS opted out',
  description:
    'Set when the contact replies STOP. Texts to this contact are blocked until they reply START.',
  icon: 'IconMessageOff',
  defaultValue: false,
});

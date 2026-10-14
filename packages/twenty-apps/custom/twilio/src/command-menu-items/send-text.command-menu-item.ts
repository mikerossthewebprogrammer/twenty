import {
  defineCommandMenuItem,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  SEND_TEXT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  SEND_TEXT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineCommandMenuItem({
  universalIdentifier: SEND_TEXT_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Send text',
  shortLabel: 'Text',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  frontComponentUniversalIdentifier:
    SEND_TEXT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});

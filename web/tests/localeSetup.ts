// Keep the existing German UI regression suite; English defaults are tested explicitly in i18n tests.
import { beforeEach } from 'vitest';
import { setLocale } from '../src/i18n';
setLocale('de');
beforeEach(() => setLocale('de'));

// Entry point for /lehrer: the teacher area. Separate page, so pupils never load it by accident.
import { createSupabase } from '../api/client';
import { renderTeacher } from './teacherView';

const root = document.getElementById('app');
if (root) {
  try {
    renderTeacher(root, createSupabase()).catch((err: unknown) => {
      console.error(err);
      root.textContent = 'Der Lehrer-Bereich konnte nicht geladen werden.';
    });
  } catch (err) {
    console.error(err);
    root.textContent = 'Die Verbindung zum Server ist nicht eingerichtet.';
  }
}

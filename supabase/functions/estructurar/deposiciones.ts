// Forma fija de las DEPOSICIONES (Formulario N° 5), aprobada por Mauro. En el papel
// se anota X o XX; acá el código (nunca la IA), después del modelo y de los
// resguardos, pasa a esa forma lo dictado en los 3 casilleros de Deposiciones:
//   - "una X", "un X", "1 X" o "X"                   -> "X"
//   - "dos X", "2 X", "doble X", "XX" o "X X"        -> "XX"
// Sin importar mayúsculas, los espacios de más ni un punto o una coma al final
// ("Una x." es "X"); "1X" y "2X" (sin espacio) también valen. Lo que no sea una de
// estas formas queda como vino del dictado, sin inventar nada ("dos" queda "dos";
// "12X" queda "12X").

const COLUMNA_DE_DEPOSICIONES = /^deposiciones_(05_13|13_21|21_05)$/;
const UNA_X = /^(?:(?:una|un)\s+|1\s*)?x$/;
const DOS_X = /^(?:(?:dos|doble)\s+x|2\s*x|xx|x\s+x)$/;

export function formaDeDeposiciones(columna: string, valor: unknown): unknown {
  if (typeof valor !== 'string' || !COLUMNA_DE_DEPOSICIONES.test(columna)) return valor;
  const forma = valor.trim().toLowerCase().replace(/[.,;:]+$/, '').replace(/\s+/g, ' ');
  if (UNA_X.test(forma)) return 'X';
  if (DOS_X.test(forma)) return 'XX';
  return valor;
}

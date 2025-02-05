import java.util.NoSuchElementException;

public interface OrderedSet extends Cloneable {

	/**
	 * Leert die Menge.
	 */
	public void clear();

	/**
	 * Berechnet die Anzahl der Elemente in der Menge und gibt diese zurueck.
	 *
	 * @return Anzahl Elemente
	 */
	public int size();

	/**
	 * Prueft, ob ein Element in der Menge enthalten ist.
	 *
	 * @param value
	 *            Element, dessen Existenz in der Menge geprueft werden soll
	 * @return true wenn enthalten, sonst false
	 */
	public boolean contains(int value);

	/**
	 * Erstellt aus der Menge ein eindimensionales Feld mit aufsteigend sortierten
	 * Elementen.
	 *
	 * @return Feld mit aufsteigend sortierten Elementen.
	 */
	public int[] toArray();

	/**
	 * Erstellt aus der Menge ein eindimensionales Feld mit absteigend sortierten
	 * Elementen.
	 *
	 * @return Feld mit absteigend sortierten Elementen.
	 */
	public int[] toReversedArray();

	/**
	 * Fuegt ein Element <b>sortiert</b> in die Menge ein. Falls ein Wert schon existiert wird die
	 * selbsterstellte ElementExistsException geworfen!
	 *
	 * @param value
	 *            Einzufuegender Wert
	 *
	 */
	public void add(int value);

	/**
	 * Fuegt alle Elemente des Feldes <b>sortiert</b> in die Menge ein. Falls ein Wert schon
	 * existiert wird die selbsterstellte ElementExistsException geworfen!
	 *
	 * @param values
	 *            Feld mit einzufuegenden Werten
	 */
	public void add(int[] values);

	/**
	 * Entfernt das Element aus der Liste.
	 *
	 * @param value
	 *            Das zu entfernende Element
	 * @throws NoSuchElementException
	 *             falls das Element nicht in der Liste vorkam
	 */
	public void remove(int value) throws NoSuchElementException;

	/**
	 * Erstellt eine Kopie der Menge.
	 *
	 * @return Kopie der Menge.
	 */
	public OrderedSet clone();

	/**
	 * Sucht in dieser Menge nach Elementen im Interval [from; to] und generiert
	 * eine neue Menge mit den gefundenen Elementen.
	 *
	 * @param from
	 *            Die untere Grenze der neuen Menge
	 * @param to
	 *            Die obere Grenze der neuen Menge
	 * @return Neue Menge mit allen gefunden Elementen aus dem Interval [from, to]
	 */
	public OrderedSet getSetInBetween(int from, int to);

	/**
	 * Berechnet die Schnittmenge dieser Menge mit der uebergebenen.
	 *
	 * @param set
	 *            Die Menge, mit der die Schnittmenge berechnet werden soll.
	 * @return Die Schnittmenge als neue Menge
	 */
	public OrderedSet intersect(OrderedSet set);

	/**
	 * Berechnet die Vereinigung dieser Menge mit der uebergebenen.
	 *
	 * @param set
	 *            Die Menge, mit der die Vereinigung berechnet werden soll.
	 * @return Die Vereinigungsmenge als neue Menge
	 */
	public OrderedSet unite(OrderedSet set);

	/**
	 * Berechnet die Mengendifferenz dieser Menge mit der uebergebenen.
	 *
	 * @param set
	 *            Die Menge, die subtrahiert werden soll
	 * @return Die Mengendifferenz als neue Menge
	 */
	public OrderedSet subtract(OrderedSet set);

	/**
	 * Gibt die Werte, getrennt durch Leerzeichen und umgeben von gescheiften
	 * Klammern, als String zurueck.</br>
	 * Beispiel fuer eine leere Menge: { }</br>
	 * Beispiel fuer eine Menge mit den Werten 3, 1 und 2: { [1] --> [2] --> [3] }
	 *
	 * @return Menge als Text
	 */
	public String toString();
}

// Maximilian Rode, 22972602
// Chang Liu, 22963247

import java.util.NoSuchElementException;

public class SortedSet implements OrderedSet {
    private ListItem head;
    private ListItem tail;
    private int size;

    public SortedSet() {
        head = null;
        tail = null;
        size = 0;
    }

    private class ListItem {
        int value;
        ListItem next;
        ListItem previous;

        ListItem(int value) {
            this.value = value;
        }

        public String toString() {
            if (next != null) {
                return "[" + value + "] --> ";
            } else {
                return "[" + value + "]";
            }
        }

        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }

            if (other == null || getClass() != other.getClass()) {
                return false;
            }

            ListItem listItem = (ListItem) other;
            return value == listItem.value;
        }
    }

    public void clear() {
        head = null;
        tail = null;
        size = 0;
    }

    public int size() {
        return size;
    }

    public boolean contains(int value) {
        ListItem current = head;
        while (current != null) {
            if (current.value == value) {
                return true;
            }
            current = current.next;
        }
        return false;
    }

    public int[] toArray() {
        int[] array = new int[size];
        ListItem current = head;
        int index = 0;
        while (current != null) {
            array[index++] = current.value;
            current = current.next;
        }
        return array;
    }

    public int[] toReversedArray() {
        int[] array = new int[size];
        ListItem current = tail;
        int index = 0;
        while (current != null) {
            array[index++] = current.value;
            current = current.previous;
        }
        return array;
    }

    public void add(int value) {
        if (head == null) {
            head = new ListItem(value);
            tail = head;
            size++;
            return;
        }

        ListItem current = head;
        ListItem previous = null;

        while (current != null && current.value < value) {
            previous = current;
            current = current.next;
        }

        if (current != null && current.value == value) {
            throw new ElementExistsException("Element already exists: " + value);
        }

        ListItem newItem = new ListItem(value);
        if (previous == null) {
            newItem.previous = head;
            head.previous = newItem;
            head = newItem;
        } else {
            newItem.next = current;
            previous.next = newItem;
            newItem.previous = previous;
            if (current != null) {
                current.previous = newItem;
            } else {
                tail = newItem;
            }
        }
        size++;
    }

    public void add(int[] values) {
        for (int value : values) {
            add(value);
        }
    }

    public void remove(int value) {
        ListItem current = head;

        while (current != null && current.value != value) {
            current = current.next;
        }

        if (current == null) {
            throw new NoSuchElementException("Element not found: " + value);
        }

        if (current.previous != null) {
            current.previous.next = current.next;
        } else {
            head = current.next;
        }

        if (current.next != null) {
            current.next.previous = current.previous;
        } else {
            tail = current.previous;
        }
        size--;
    }

    public OrderedSet clone() {
        try {
            SortedSet cloneSet = (SortedSet) super.clone();
            cloneSet.clear();
            ListItem current = head;
            while (current != null) {
                cloneSet.add(current.value);
                current = current.next;
            }
            return cloneSet;
        } catch (CloneNotSupportedException e) {
            throw new AssertionError();
        }
    }

    public OrderedSet getSetInBetween(int from, int to) {
        SortedSet subset = new SortedSet();
        ListItem current = head;
        while (current != null) {
            if (current.value >= from && current.value <= to) {
                subset.add(current.value);
            }
            current = current.next;
        }
        return subset;
    }

    public OrderedSet intersect(OrderedSet other) {
        SortedSet result = new SortedSet();
        ListItem current = head;
        while (current != null) {
            if (other.contains(current.value)) {
                result.add(current.value);
            }
            current = current.next;
        }
        return result;

    }

    public OrderedSet unite(OrderedSet other) {
        SortedSet result = new SortedSet();
        ListItem current = head;
        while (current != null) {
            result.add(current.value);
            current = current.next;
        }
        int[] otherArray = other.toArray();
        for (int value : otherArray) {
            if (!result.contains(value)) {
                result.add(value);
            }
        }
        return result;
    }

    public OrderedSet subtract(OrderedSet other) {
        SortedSet result = new SortedSet();
        ListItem current = head;
        while (current != null) {
            if (!other.contains(current.value)) {
                result.add(current.value);
            }
            current = current.next;
        }
        return result;
    }

    public String toString() {
        StringBuilder sb = new StringBuilder("{");
        ListItem current = head;
        while (current != null) {
            sb.append("[").append(current.value).append("]");
            if (current.next != null) {
                sb.append(" --> ");
            }
            current = current.next;
        }
        sb.append("}");
        return sb.toString();
    }

    public static void main(String[] args) {
        OrderedSet set1 = new SortedSet();
        OrderedSet set2 = new SortedSet();

        System.out.println("Set 1:" + set1);
        System.out.println("Set 2:" + set2);

        int[] elements1 = {1, 6, 4, 2, 7, 5, 12};
        for (int element : elements1) {
            set1.add(element);
        }

        set2.add(new int[]{5, 23, 22, 7, 9});

        System.out.println("Set 1:" + set1);
        System.out.println("Set 2:" + set2);

        set2.remove(22);
        try {
            set2.remove(77);
        } catch (NoSuchElementException e) {
            System.err.println(e.getMessage());
        }

        //g)
        OrderedSet subset = set1.getSetInBetween(2, 6);
        System.out.println("Subset of Set 1 with elements between 2 and 6" + subset);

        //h)
        OrderedSet intersectionSet = set1.intersect(set2);
        System.out.println("Intersection of Set 1 and Set 2" + intersectionSet);

        OrderedSet unionSet = set1.unite(set2);
        System.out.println("Union of Set 1 and Set 2" + unionSet);

        OrderedSet differenceSet = set1.subtract(set2);
        System.out.println("Difference of Set 1 and Set 2" + differenceSet);

        //i) neue Menge mit den Elementen 18, 19, 20. Vereinigungsmenge mit erster Menge

        OrderedSet set3 = new SortedSet();
        set3.add(new int[]{18, 19, 20});
        OrderedSet unionSet2 = set1.unite(set3);
        System.out.println("Union of Set 1 and Set 3" + unionSet2);
    }
}




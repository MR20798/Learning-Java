// Maximilian Rode, 22972602
// Chang Liu, 22963247

import java.util.NoSuchElementException;

public class AuDClosedHashTable extends AuDHashTable {

    private Contact[] table;
    private boolean[] deleted;
    private int counter;

    public AuDClosedHashTable(int capacity) {
        super(capacity);
        table = new Contact[capacity];
        deleted = new boolean[capacity];
        counter = 0;
    }

    protected boolean isFull() {
        return counter == capacity;
    }

    protected int hash(String s, int i) {
        int hashValue = hash(s);
        if (i % 2 == 0) {
            return Math.floorMod(hashValue - i / 2 - 1, capacity);
        } else {
            return Math.floorMod(hashValue + i / 2, capacity);
        }
    }

    @Override
    public void insert(Contact c) {
        if (isFull()) {
            throw new UnsupportedOperationException("Hash table is full");
        }
        int i = 0;
        int index;
        do {
            index = hash(c.getEmail(), i);
            i++;
        } while (table[index] != null && !deleted[index]);
        table[index] = c;
        deleted[index] = false;
        counter++;
    }

    private int getIndexOf(String email) {
        int i = 0;
        int index;
        do {
            index = hash(email, i);
            if (table[index] != null && table[index].getEmail().equals(email)) {
                return index;
            }
            i++;
        } while (table[index] != null || deleted[index]);
        throw new NoSuchElementException("Contact not found");
    }

    @Override
    public void remove(Contact c) {
        int index = getIndexOf(c.getEmail());
        table[index] = null;
        deleted[index] = true;
        counter--;
    }

    @Override
    public Contact getContact(String email) {
        int index = getIndexOf(email);
        return table[index];
    }
}

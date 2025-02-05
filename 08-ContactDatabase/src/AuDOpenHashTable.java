// Maximilian Rode, 22972602
// Chang Liu, 22963247

import java.util.LinkedList;
import java.util.NoSuchElementException;

public class AuDOpenHashTable extends AuDHashTable {

    private LinkedList<Contact>[] table;

    @SuppressWarnings("unchecked")
    public AuDOpenHashTable(int capacity) {
        super(capacity);
        table = new LinkedList[capacity];
        for (int i = 0; i < capacity; i++) {
            table[i] = new LinkedList<>();
        }
    }

    @Override
    public void insert(Contact c) {
        int index = hash(c.getEmail());
        table[index].add(c);
    }

    @Override
    public void remove(Contact c) {
        int index = hash(c.getEmail());
        if (!table[index].remove(c)) {
            throw new NoSuchElementException("Contact not found");
        }
    }

    @Override
    public Contact getContact(String email) {
        int index = hash(email);
        for (Contact c : table[index]) {
            if (c.getEmail().equals(email)) {
                return c;
            }
        }
        throw new NoSuchElementException("Contact not found");
    }
}

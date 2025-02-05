// Maximilian Rode, 22972602
// Chang Liu, 22963247

import java.util.NoSuchElementException;

public class ContactDatabase {

    public static void main(String[] args) {
        AuDOpenHashTable openHashTable = new AuDOpenHashTable(10);
        AuDClosedHashTable closedHashTable = new AuDClosedHashTable(10);

        Contact contact1 = new Contact("john.doe@example.com");
        contact1.setName("John Doe");
        contact1.setTelephone("123456789");

        Contact contact2 = new Contact("jane.doe@example.com");
        contact2.setName("Jane Doe");
        contact2.setTelephone("987654321");

        // Test Open Hash Table
        openHashTable.insert(contact1);
        openHashTable.insert(contact2);

        System.out.println("Open Hash Table:");
        System.out.println(openHashTable.getContact("john.doe@example.com"));
        System.out.println(openHashTable.getContact("jane.doe@example.com"));

        openHashTable.remove(contact1);
        try {
            System.out.println(openHashTable.getContact("john.doe@example.com"));
        } catch (NoSuchElementException e) {
            System.out.println("John Doe not found in open hash table.");
        }

        // Test Closed Hash Table
        closedHashTable.insert(contact1);
        closedHashTable.insert(contact2);

        System.out.println("Closed Hash Table:");
        System.out.println(closedHashTable.getContact("john.doe@example.com"));
        System.out.println(closedHashTable.getContact("jane.doe@example.com"));

        closedHashTable.remove(contact1);
        try {
            System.out.println(closedHashTable.getContact("john.doe@example.com"));
        } catch (NoSuchElementException e) {
            System.out.println("John Doe not found in closed hash table.");
        }
    }
}

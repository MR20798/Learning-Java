//TIP To <b>Run</b> code, press <shortcut actionId="Run"/> or
// click the <icon src="AllIcons.Actions.Execute"/> icon in the gutter.
public class Loops {
    //von Maximilian Rode
    public static void main(String[] args) {
        //von 0-10
        for (int i = 0; i <= 10; i++) {
             System.out.print(i + " ");
             }
         System.out.println();

        //von 0-10 (mit < Operator)
        for (int i = 0; i < 11; i++) {
             System.out.print(i + " ");
             }
         System.out.println();

        //6er Schritte von 6 bis inklusive 42
        for (int i = 6; i <= 42; i += 6) {
             System.out.print(i + " ");
             }
         System.out.println();

        //2er Schritte von 23 bis inklusive 11
        for (int i = 23; i >= 11; i -= 2) {
             System.out.print(i + " ");
             }
         System.out.println();

        //Alle geraden Zahlen von 8-17
        for (int i = 8; i <= 17; i += 2) {
             System.out.print(i + " ");
             }
         System.out.println();

        //Schleife in 2er Potenz-Schritten von 16 bis inklusive 711
        for (int i = 16; i <= 711; i *= 2) {
             if (i % 2 == 0) { //nur die 2er Potenzen durchlaufen
                 System.out.print(i + " ");
                 }
             }
         System.out.println();

         //2.2.3 Umwandlung for zu while ohne break
        int m = 7;
        int i = 0;
        while (i <= m) {
             System.out.print(i + " ");
             i++;
             }
         System.out.println();

        i = 42;
         while (2 * i > m) {
             System.out.print(i + " ");
             i -= 6;
             }
         System.out.println();

         //2.2.4 mit break verhindert Endlos-Schleife
        while (true) {
            if (i > m) {
                 break;
                 }
             System.out.print(i + " ");
             i++;
        }
        System.out.println();

        //2.2.5
        //a.)Deklaration und Initialisierung von nMax in main
        int nMax = 5;
         double x = 2.0;
         double a = 2.0;

         // b.) und c.) Schleife mit int n mit Ausgabe
          for (int n = 0; n <= nMax; n++) {
          x = 0.5 * (x + a / x); // c.i) Berechnung von xn+1 und Speichern in der Variable x

        System.out.println("Approximation at step " + n + ": " + x); // c.ii)

         }

    }
}





        //TIP Press <shortcut actionId="ShowIntentionActions"/> with your caret at the highlighted text
        // to see how IntelliJ IDEA suggests fixing it
// Maximilian Rode, 22972602
// Chang Liu, 22963247

public class PaintCan extends Paint {

    public static void main(String[] args) {
        PaintCan p = new PaintCan();
    }

    public void fillBob(int x, int y) {
        while (!isFilled(x, y - 1)) {
            y = y - 1;
        }

        while (!isFilled(x, y)) {
            int x2 = x;
            while (!isFilled(x2, y)) {
                fillPixel(x2, y);
                x2++;
            }
            x2 = x - 1;

            while (!isFilled(x2, y)) {
                fillPixel(x2, y);
                x2--;
            }
            y++;
        }

        /* Warum funktioniert dieser Code nicht? (2 Punkte)
        Der Code funktioniert nicht , weil nicht alle moeglichen Luecken der zu fuellenden Flaeche abgedeckt
        Es werden nur horizontale und vertikale Flaechen geprueft was bei komplexeren Formen nicht ausreicht, bspw Diagonalen
         */

    }

    public void fillRec(int x, int y) {
        /* Wie wuerden Sie dieses Problem angehen? (2 Punkte)
        Ich wuerde das Problem mit einer rekursiven Flood-Fill-Methode angehen, die vom Startpunkt in alle vier Richtungen weiterlaeuft und die Fl?che f?llt */
        // Rekursive Loesung (3 Punkte)
        if (!isFilled(x, y)) {
            fillPixel(x, y);
            fillRec(x + 1, y);
            fillRec(x - 1, y);
            fillRec(x, y + 1);
            fillRec(x, y - 1);
        }

    }

    // Zusammenhang zwischen Traversierung von Graphen und dem Fuellen von Flaechen? (keine Punkte, aber interessant)
    /* Das Fuellen der Flaechen kann als Traversierung eines Graphen betrachtet werden bei der jeder Pixel ein Knoten und
    die Kanten die benachbarten Pixel darstellen
     */
}

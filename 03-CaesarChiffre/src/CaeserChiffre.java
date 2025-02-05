// Maximilian Rode, 22972602
// Chang Liu, 22963247
//Leider nicht geschafft

public class CaeserChiffre {


    public static final String ENCRYPTED_MESSAGE = "ugjt iwv! fw jcuv fgp eqfg igmpcemv wpf fkt uq twjo wpf gjtg gtyqtdgp. ykg fw ukgjuv, kuv fkgugu xgtuejnwguugnwpiuxgthcjtgp ugjt ngkejv |w mpcemgp. mqornk|kgtvgtg xgthcjtgp ygtfgp kp cpfgtgp xgtcpuvcnvwpigp pcgjgt dgvtcejvgv.";
    public static final char SEPARATOR = ' ';

}
/*
    public static void main(String[] args){
        //Aufgabe 4
        String germanLanguagePattern = loadTextFromFile("language-pattern.txt");
        int[] histogram = getHistogram(germanLanguagePattern);
        char significantLetter = getSignificantLetter(germanLanguagePattern);
        int quantity = histogram[significantLetter];
        int totalCharacters = germanLanguagePattern.replaceAll("\\s", "").length();
        double quota = ((double) quantity / totalCharacters) * 100;

        //Aufgabe 5
        System.out.println("Most significant letter: " + significantLetter +
                " Quantity: " + quantity + " times (" + quota + "% of whole text).");

        //Aufgabe 6
        int shift = getShift(ENCRYPTED_MESSAGE, germanLanguagePattern);
        String decodedText = decode(ENCRYPTED_MESSAGE, germanLanguagePattern);

        //Aufgabe 8
        System.out.println("Unreadable, encrypted input text:\n" + ENCRYPTED_MESSAGE);
        System.out.println("\nReadable, decoded output text:\n" + decodedText);

        //Aufgabe 9
        // Kommentar am Ende der main-Methode
        // Decoded text: sehr gut! du hast den code geknackt und dir so ruhm und ehre erworben. wie du siehst, ist
        // dieses verschluesselungsverfahren sehr leicht zu knacken. kompli|iertere verfahren werden in anderen
        // veranstaltungen naeher betrachtet.>

    }

    }


    //Aufgabe 4
    public static int getIndexOfMaximumEntry(int[] values) {
        int maxIndex = 0;
        for (int i = 1; i < values.length; i++) {
            if (values[i] > values[maxIndex]) {
                maxIndex = i;

            }
        }
        return maxIndex;
    }


    //Aufgabe 5a-f)
    public static int[] getHistogram(String text) {
        int[] histogram = new int[256]; // ASCII-Zeichensatz
        text = text.toLowerCase();

        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c != SEPARATOR) {
                histogram[c]++;
            }
        }

        return histogram;
    }

    public static char getSignificantLetter (String text){
            int[] histogram = getHistogram(text);
            int significantLetterIndex = getIndexOfMaximumEntry(histogram);
            char significantLetter = (char) significantLetterIndex;
            int quantity = histogram[significantLetter];
            int totalCharacters = text.replaceAll("\\s", "").length();
            int quota = ((int) quantity / totalCharacters) * 100;

            System.out.println("Most significant letter: " + significantLetter +
                    " Quantity: " + quantity + " times (" + quota + "% of whole text).");
            return significantLetter;
        }

        //Aufgabe 6a-e)
        public static int getShift(String encryptedText, String languagePattern) {
            char sigOfPattern = getSignificantLetter(languagePattern);
            char sigOfChiffre = getSignificantLetter(encryptedText);
            int shift = sigOfChiffre - sigOfPattern;

            System.out.println("Most significant letter in the encrypted text: " + sigOfChiffre +
                    " Resulting shift: " + shift);

            return shift;
        }

            //Aufgabe 6f-k)
            public static String decode(String encryptedText, String languagePattern) {
                int shift = getShift(encryptedText, languagePattern);
                char[] lettersEncryptedText = encryptedText.toCharArray();

                for (int i = 0; i < lettersEncryptedText.length; i++) {
                    char currentChar = lettersEncryptedText[i];
                    if (Character.isLetter(currentChar)) {
                        lettersEncryptedText[i] = (char) ((currentChar - shift + 26) % 26 +);
                    }
                }
                return new String(lettersEncryptedText);

                try {
                    //Text aus Datei laden
                    return new String(Files.readAllBytes(Paths.get(filename)));
                } catch (IOException e) {
                    e.printStackTrace();
                    return "";
                */




public class Arrays {

	public static void printArray(int[] array) {
		System.out.print("[");
		for (int i = 0; i < array.length; i++) {
			System.out.print(array[i]);
			if (i < array.length - 1) {
				System.out.print(", ");
			 }
		 }
		 System.out.println("]");
		// TODO: Implementieren Sie hier die Ausgabe des Arrays array
	}

	public static int sum(int[] array) {
		//Berechnung
		int sum = 0;
		for (int num : array){
			sum += num;
			 }
		// TODO: Berechnen Sie die Summe der Elemente des Arrays und geben Sie diese zurueck
		// Ergebnis
		return sum;
	}

	public static double mean(int[] array) {
		//Berechnung
		if (array.length == 0) {
			return 0; // Wenn das Array leer ist, ist der Mittelwert 0
		}
		int sum = 0;
		for (int num : array) {
			sum += num;
		// TODO: Berechnen Sie den Mittelwert von array und geben Sie ihn zurueck
		return sum / array.length;
	}

	public static int[] sumArrays(int[] array1, int[] array2) {
			//Arrays summieren
			int[] sumArray = new int[array1.length + array2.length];
			for (int i = 0; i < minLength; i++) {
				sumArray[i] = array1[i] + array2[i];
			}
			return sumArray;
		// TODO: Berechnen Sie die Summe der beiden Arrays und geben Sie das Ergebnis zurueck
		//return new int[0];siehe sumArray?
	}

	public static int maximum(int[] array) {
		// TODO: Bestimmen Sie das Maximum des Arrays und geben Sie es zurueck
		return 0;
	}

	public static int[] tail(int[] array) {
		// TODO: Bestimmen Sie das kuerzere Array und geben Sie es zurueck
		return new int[0];
	}

	public static boolean checkSorting(int[] array) {
		// TODO: Ermitteln Sie, ob array sortiert ist. Falls ja, soll true zurueckgegeben werden, falls nein, false. Geben Sie das Ergebnis zurueck.
		
		
		return false;
	}

	public static boolean[] evenNumbers(int[] array) {
		// TODO: Ermitteln Sie hier die geraden Elemente in array. Geben Sie das neu erzeugte Array zurueck
		
		return new boolean[0];
	}
	
	public static void printBooleanArray(boolean[] array) {
		// TODO: Implementieren Sie diese Methode fuer die letzte Teilaufgabe (analog zu printArray)
	}


	public static void main(String[] args) {
		// TODO: Testen Sie hier Ihre Methoden ausgiebig!
	}
}

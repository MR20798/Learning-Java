// Maximilian Rode, 22972602
// Chang Liu, 22963247


public class SignalPlotter {
    // Konstanten fuer Stuetzstellen
    private static final double firstLimit = -10.0;
    private static final double secondLimit = 10.0;
    private static final int numberOfPoints = 1000;

    //Konstante fuer Abtastrate des EKG-Signals
    public static final int SAMPLING_RATE = 250;

    public static void main (String[] args) {
        //Aufgabe 4
        plotSigmoid();
        //Aufgabe 5
        plotEcg();
    }

    //Aufgabe 3a)
    public static double[] createSamplingPoints(double firstLimit, double secondLimit, int numberOfPoints) {
        if (firstLimit == secondLimit) {
            numberOfPoints = 1;
        }

        double[] samplingPoints = new double[numberOfPoints];
        double step = (secondLimit - firstLimit) / (numberOfPoints - 1);

        for (int i = 0; i < numberOfPoints; i++) {
            samplingPoints[i] = firstLimit + i * step;
        }

        return samplingPoints;
    }

    //Aufgabe 4a)
    public static double sigmoid(double x) {
        return 1.0 / (1.0 + Math.exp(-x));
    }

    //Aufgabe 4b)
    public static double[] applySigmoidToArray(double[] xs) {
        double[] result = new double[xs.length];

        for (int i = 0; i < xs.length; i++) {
            result[i] = sigmoid(xs[i]);
        }
        return result;
    }

    //Aufgabe 4c) , 4d)
    public static void plotSigmoid() {
        double[] xs = createSamplingPoints(firstLimit, secondLimit, numberOfPoints);
        double[] ys = applySigmoidToArray(xs);


        //Aufgabe 4iv)
        PlotHelper.plot2D(xs, ys);
    }

    //Aufgabe 5
    public static void plotEcg() {
        // Aufgabe 5a)
        double[] ecgSignal = PlotHelper.readEcg("ecg.txt");

        //Aufgabe 5b)
        int samplingRate = SAMPLING_RATE;

        //Aufgabe 5c)
        double[] ecgTime = createSamplingPoints(0, ecgSignal.length / samplingRate, ecgSignal.length);

        //Aufgabe 5d)
        PlotHelper.plotEcg(ecgTime, ecgSignal);

        //Aufgabe 5e)
        int[] idxRPeaks = PlotHelper.readPeaks("peaks.txt");

        //Aufgaben 5f)
        double[] rPeaks = new double[idxRPeaks.length];
        double[] timeRPeaks = new double[idxRPeaks.length];

        for (int i = 0; i < idxRPeaks.length; i++) {
            rPeaks[i] = ecgSignal[idxRPeaks[i]];
            timeRPeaks[i] = ecgTime[idxRPeaks[i]];
        }

        PlotHelper.plotEcg(ecgTime, ecgSignal, timeRPeaks, rPeaks);

        //Aufgabe 5g)
        computeHeartRate(timeRPeaks);
    }

    public static void computeHeartRate(double[] timeRPeaks) {
        System.out.println("Heart Rate:");
        for (int i = 1; i < timeRPeaks.length; i++) {
            double timeDifference = timeRPeaks[i] - timeRPeaks[i - 1];
            double heartRate = 60.0 / timeDifference;
            System.out.println(String.format("%.2f bpm", heartRate));
        }
    }
}


import java.awt.Color;
import java.io.BufferedReader;
import java.io.FileReader;
import java.util.ArrayList;

import javax.swing.JFrame;
import org.math.plot.Plot2DPanel;
import org.math.plot.Plot3DPanel;

public final class PlotHelper {

	private static int FRAME_ID = 0;

	public static double[] readEcg(String filename) {
		ArrayList<Double> signalList = new ArrayList<Double>();
		BufferedReader br;
		try {
			br = new BufferedReader(new FileReader(filename));
			String line;
			while ((line = br.readLine()) != null) {
				signalList.add(Double.parseDouble(line));
			}

			br.close();
		} catch (Exception e) {
			e.printStackTrace();
			return new double[0];
		}

		return signalList.stream().mapToDouble(Double::doubleValue).toArray();
	}

	public static int[] readPeaks(String filename) {
		ArrayList<Integer> signalList = new ArrayList<Integer>();
		BufferedReader br;
		try {
			br = new BufferedReader(new FileReader(filename));
			String line;
			while ((line = br.readLine()) != null) {
				signalList.add(Integer.parseInt(line));
			}

			br.close();
		} catch (Exception e) {
			e.printStackTrace();
			return new int[0];
		}

		return signalList.stream().mapToInt(Integer::intValue).toArray();
	}

	public static void plot2D(double[] xs, double[] ys) {
		JFrame frame = createFrame("Plot 2D");
		Plot2DPanel panel = new Plot2DPanel();
		panel.addLinePlot("plot", xs, ys);
		frame.getContentPane().add(panel);
		frame.setVisible(true);
	}

	public static void plotEcg(double[] time, double[] ecg) {
		plotEcg(time, ecg, null, null);
	}

	public static void plotEcg(double[] time, double[] ecg, double[] timeRPeaks, double[] rPeaks) {
		JFrame frame = createFrame("Plot 2D");
		Plot2DPanel panel = new Plot2DPanel();
		panel.addLinePlot("plot", time, ecg);
		if (timeRPeaks != null && rPeaks != null) {
			panel.addScatterPlot("plot", timeRPeaks, rPeaks);
		}
		frame.getContentPane().add(panel);
		frame.setVisible(true);
	}

	public static void plot3D(double[] xs, double[] ys, double[][] zs) {
		JFrame frame = createFrame("Plot 3D");
		Plot3DPanel panel = new Plot3DPanel();
		panel.addGridPlot("plot", Color.BLUE, xs, ys, zs);
		frame.getContentPane().add(panel);
		frame.setVisible(true);
	}

	private static JFrame createFrame(String title) {
		JFrame frame = new JFrame(title + " (" + FRAME_ID++ + ")");
		frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
		frame.setLocationRelativeTo(null);
		frame.setSize(500, 400);
		return frame;
	}

}

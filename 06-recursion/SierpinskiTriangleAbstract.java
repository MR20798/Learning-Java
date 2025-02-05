import java.awt.Color;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;

import javax.swing.JFrame;

public abstract class SierpinskiTriangleAbstract extends JFrame implements KeyListener {

	private static final long serialVersionUID = -3088085457878787186L;
	protected int depth = 1;
	protected Graphics2D g;
	protected Color color;
	protected boolean useRandomColor;

	public SierpinskiTriangleAbstract() {
		super();

		setSize(729, 729);
		getContentPane().setBackground(Color.WHITE);
		setVisible(true);
		addKeyListener(this);
		setFocusable(true);
		setTitle("Sierpinski Triangle");
		setDefaultCloseOperation(EXIT_ON_CLOSE);
	}

	@Override
	public void paint(Graphics g) {
		super.paint(g);
		this.g = (Graphics2D) g;
		this.g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
		drawTriangle();
	}

	protected void drawTriangle() {
		drawTriangleRec(10, getHeight()-10, getWidth()-10, getHeight()-10, getWidth()/2, 30, depth, color);
	}
	
	@Override
	public void keyPressed(KeyEvent e) {
		handleInput(e.getKeyCode());
	}

	@Override
	public void keyReleased(KeyEvent e) {
		// do nothing
	}

	@Override
	public void keyTyped(KeyEvent e) {
		// do nothing
	}

	protected abstract void drawTriangleRec(int ax, int ay, int bx, int by, int cx, int cy, int depth, Color color);

	protected abstract void handleInput(int keyCode);

	protected abstract void toggleRandomColor();
}

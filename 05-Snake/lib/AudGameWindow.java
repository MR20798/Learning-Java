// =================================
// DO NOT MODIFY THIS CLASS
// =================================

import java.awt.Color;
import java.awt.Component;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.Toolkit;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.awt.image.BufferStrategy;
import java.awt.image.BufferedImage;
import java.lang.reflect.InvocationTargetException;
import java.util.HashSet;
import java.util.Set;

import javax.swing.JFrame;
import javax.swing.SwingUtilities;
import javax.swing.Timer;

/**
 * An abstract base class for graphical games with keyboard input.
 * 
 * @version 2019-10-10
 * @author Martin Gropp, Robert Richer, Rene Raab
 */
public abstract class AudGameWindow extends JFrame {
	private static final long serialVersionUID = -4782895485852937036L;

	private static final int KEY_TIMER_INTERVAL = 32; 
	
	private Timer gameTimer;
	
	private Timer keyTimer;
	private int keyPressed = KeyEvent.VK_UNDEFINED;
	private Set<Integer> repeatableKeys = new HashSet<Integer>();
	
	private long startTime = -1;
	
	private boolean showFps = false;
	private String fps = "";
	private long fpsTime = System.currentTimeMillis();
	private int fpsCount = 0;
	
	/**
	 * Create a game using a default timer interval (32ms).
	 */
	public AudGameWindow() {
		this(32);
	}
	
	/**
	 * Create a game using a specified timer interval.
	 * 
	 * @param timerInterval
	 *   The time in milliseconds between game ticks.
	 */
	public AudGameWindow(int timerInterval) {
		setSize(800, 600);
		setVisible(true);
		
		// without this line the game sometimes won't paint...
		createBufferStrategy(2);
		
		setIgnoreRepaint(true);
		
		while (true) {
			try {
				SwingUtilities.invokeAndWait(
					new Runnable() {
						@Override
						public void run() {
							createBufferStrategy(2);
						}
					}
				);
			}
			catch (InterruptedException ex) {
				continue;
			}
			catch (InvocationTargetException ex) {
				throw new RuntimeException(ex);
			}
			
			break;
		}
		
		// Game Timer
		gameTimer = new Timer(
			timerInterval,
			new ActionListener() {
				@Override
				public final void actionPerformed(ActionEvent event) {
					updateGame(System.currentTimeMillis());
					repaintGame();
				}
			}
		);
		
		gameTimer.setRepeats(true);
		gameTimer.setCoalesce(true);
		
		
		// Keyboard
		keyTimer = new Timer(
			KEY_TIMER_INTERVAL,
			new ActionListener() {
				@Override
				public void actionPerformed(ActionEvent event) {
					handleInput(keyPressed);
				}
			}
		);
		
		keyTimer.setRepeats(true);
		keyTimer.setCoalesce(true);
		
		addKeyListener(
			new KeyListener() {
				@Override
				public void keyPressed(java.awt.event.KeyEvent e) {
					if (repeatableKeys.contains(e.getKeyCode())) {
						keyTimer.stop();
						keyPressed = e.getKeyCode();
						keyTimer.start();
					}
					
					handleInput(e.getKeyCode());
				}

				@Override
				public void keyReleased(java.awt.event.KeyEvent e) {
					if (e.getKeyCode() == keyPressed) {
						keyTimer.stop();
					}
				}

				@Override
				public void keyTyped(java.awt.event.KeyEvent e) {
				}
			}
		);
		
		setFocusable(true);
		requestFocus();
		
		setDefaultCloseOperation(EXIT_ON_CLOSE);
	}
	
	/**
	 * Start the game timer.
	 */
	public void start() {
		gameTimer.start();
		startTime = System.currentTimeMillis();
	}
	
	/**
	 * Stop the game timer.
	 */
	public void stop() {
		keyPressed = KeyEvent.VK_UNDEFINED;
		gameTimer.stop();
	}
	
	/**
	 * Return the width of the game area (which may be
	 * different from the windows width).
	 */
	public int getGameAreaWidth() {
		return getContentPane().getWidth();
	}
	
	/**
	 * Return the height of the game area (which may be
	 * different from the windows height).
	 */
	public int getGameAreaHeight() {
		return getContentPane().getHeight();
	}
	
	/**
	 * Sets the width of the game window.
	 * 
	 * @param value
	 *   the new width of the game area in pixels
	 */
	public void setGameAreaWidth(int value) {
		setSize(value + getWidth() - getContentPane().getWidth(), getHeight());
		getContentPane().setSize(value, getGameAreaHeight());
	}
	
	/**
	 * Sets the height of the game window.
	 * 
	 * @param value
	 *   the new height of the game area in pixels
	 */
	public void setGameAreaHeight(int value) {
		setSize(getWidth(), value + getHeight() - getContentPane().getHeight());
		getContentPane().setSize(getGameAreaWidth(), value);
	}
	
	/**
	 * Repaint the game. 
	 * This is called by the game timer after updateGame.
	 * The method implements double buffering around paintGame,
	 * which is the method you should override to paint the game.
	 */
	private void repaintGame() {
		BufferStrategy strategy = getBufferStrategy();
		
		long now = System.currentTimeMillis();
		if (now - fpsTime > 1000) {
			fps = String.format(
				"%.1f fps",
				(1000.0 * fpsCount) / (now - fpsTime)
			);
			fpsTime = now;
			fpsCount = 0;
		}
		
		fpsCount++;
		
		BufferedImage img = new BufferedImage(getGameAreaWidth(), getGameAreaHeight(), BufferedImage.TYPE_INT_RGB);
		Graphics2D g = img.createGraphics();
		try {
			g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
			long start = System.currentTimeMillis();
			paintGame(new AudGraphics(g));
			long dur = System.currentTimeMillis() - start;
			if (showFps) {
				String text = fps + " (paintGame: " + dur + "ms)";
				int width = g.getFontMetrics().stringWidth(text);
				int height = g.getFontMetrics().getHeight();
				g.setColor(Color.DARK_GRAY);
				g.fillRoundRect(1, 1, width+2, height+2, 6, 6);
				
				g.setColor(Color.GRAY);
				g.drawString(text, 2, g.getFontMetrics().getAscent()+2);
			}
		}
		finally {
			g.dispose();
		}
		
		do {
			do {
				Component pane = rootPane;
				Graphics2D g2 = (Graphics2D)strategy.getDrawGraphics().create(pane.getX(), pane.getY(), pane.getWidth(), pane.getHeight());
				try {
					g2.drawImage(img, 0, 0, null);
				}
				finally {
					g2.dispose();
				}
			
			} while (strategy.contentsRestored());
			
			getBufferStrategy().show();
			
		} while (strategy.contentsLost());
		
		Toolkit.getDefaultToolkit().sync();
	}

	/**
	 * Set the keys that repeat their handleInput calls
	 * when being held down.
	 * For example, in order to make the left and right keys
	 * repeatable, use setRepeatableKeys(KeyEvent.VK_LEFT, KeyEvent.VK_RIGHT).
	 * 
	 * Calling this method overwrites existing repeatable key settings.
	 * 
	 * @param keyCodes
	 *   The repeatable keys. 
	 *   Possible values are the key codes defined in java.awt.event.KeyEvent
	 *   (e.g. KeyEvent.VK_SPACE).
	 *   Note that this is a "varargs" parameter, i.e. any number of key
	 *   code parameters can be specified.
	 */
	public void setRepeatableKeys(int... keyCodes) {
		repeatableKeys.clear();
		for (int key : keyCodes) {
			repeatableKeys.add(key);
		}
	}
	
	/**
	 * Enable/disable fps display.
	 */
	public void setShowFps(boolean showFps) {
		this.showFps = showFps;
	}
	
	/**
	 * Check if the number of frames rendered per second is displayed.
	 */
	public boolean getShowFps() {
		return showFps;
	}
	
	/**
	 * Returns the time at which the game was started.
	 * 
	 * @return
	 *   the system time in milliseconds at which the start() method was called
	 */
	public long getStartTime() {
		if (startTime == -1l) {
			throw new IllegalStateException("The game has not been started yet!");
		}
		return startTime;
	}
	
	/**
	 * Shows a Swing dialog with the given text.
	 * @param text The text to be displayed in the dialog window.
	 */
	protected void showDialog(String text) {
		javax.swing.JOptionPane.showMessageDialog(this, text);
	}

	
	/**
	 * Update the game, move objects etc.
	 * This is called by the game timer once every timerInterval milliseconds
	 * (this value can changed in the constructor and defaults to 32ms).
	 *   
	 * @param time
	 *   The current game time in milliseconds.
	 */
	public abstract void updateGame(long time);
	
	/**
	 * Paint the game.
	 * This is called automatically when the game needs to be painted.
	 * 
	 * @param g
	 *   A Graphics object (actually Graphics2D) that can be used for
	 *   painting the game.
	 */
	public abstract void paintGame(AudGraphics g);
	
	/**
	 * Handle keyboard input.
	 * 
	 * @param keyCode
	 *   The pressed key. The value is the one of the key codes
	 *   defined in java.awt.event.KeyEvent (e.g. KeyEvent.VK_SPACE).
	 */
	public abstract void handleInput(int keyCode);
	
	
	/**
	 * Most important KeyEvents. We can't use java.awt.KeyEvent as the EST does not allow java.awt :(
	 */
	public static class KeyEvent {

	    /**
	     * Constant for the non-numpad <b>left</b> arrow key.
	     * @see #VK_KP_LEFT
	     */
	    public static final int VK_LEFT           = 0x25;

	    /**
	     * Constant for the non-numpad <b>up</b> arrow key.
	     * @see #VK_KP_UP
	     */
	    public static final int VK_UP             = 0x26;

	    /**
	     * Constant for the non-numpad <b>right</b> arrow key.
	     * @see #VK_KP_RIGHT
	     */
	    public static final int VK_RIGHT          = 0x27;

	    /**
	     * Constant for the non-numpad <b>down</b> arrow key.
	     * @see #VK_KP_DOWN
	     */
	    public static final int VK_DOWN           = 0x28;
	    
	    /**
	     * This value is used to indicate that the keyCode is unknown.
	     * KEY_TYPED events do not have a keyCode value; this value
	     * is used instead.
	     */
	    public static final int VK_UNDEFINED      = 0x0;
	}
}

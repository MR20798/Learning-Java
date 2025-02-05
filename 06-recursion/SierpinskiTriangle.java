// Maximilian Rode, 22972602
// Chang Liu, 22963247

import java.awt.Color;
import java.awt.event.KeyEvent;

public class SierpinskiTriangle extends SierpinskiTriangleAbstract {
    private static final long serialVersionUID = 1L;
    private static final int MIN_DEPTH = 0;
    private static final int MAX_DEPTH = 7;

    //Constructor
    public SierpinskiTriangle() {
        super();
    }

    //Draw and fill triangle
    @Override
    protected void drawTriangleRec(int ax, int ay, int bx, int by, int cx, int cy, int depth, Color color) {
        if (depth == 0) {
            int[] xPoints = {ax, bx, cx};
            int[] yPoints = {ay, by, cy};
            g.setColor(color);
            g.fillPolygon(xPoints, yPoints, 3);
            return;
        }

        //Midpoints triangle edges
        int dx = bx + (cx - bx) / 2;
        int dy = by + (cy - by) / 2;
        int ex = ax + (cx - ax) / 2;
        int ey = ay + (cy - ay) / 2;
        int fx = ax + (bx - ax) / 2;
        int fy = ay + (by - ay) / 2;

        Color nextColor = color.brighter();
        

        //Fall below side length (2)
        if (depth == 0 || Math.abs(bx - ax) < 4){
            return;
        }

        //Recursive Calls
        drawTriangleRec(ax, ay, fx, fy, ex, ey, depth - 1, nextColor);
        drawTriangleRec(fx, fy, bx, by, dx, dy, depth - 1, nextColor);
        drawTriangleRec(ex, ey, dx, dy, cx, cy, depth - 1, nextColor);

    }

    @Override
    protected void handleInput(int keyCode) {
        if (keyCode == KeyEvent.VK_UP) {
            if (this.depth < MAX_DEPTH) {
                this.depth++;
            }
        } else if (keyCode == KeyEvent.VK_DOWN) {
            if (this.depth > MIN_DEPTH) {
                this.depth--;
            }
        } else if (keyCode == KeyEvent.VK_SPACE) {
            toggleRandomColor();
        }
        paint(getGraphics());
    }

    @Override
    protected void toggleRandomColor() {
        useRandomColor = !useRandomColor;
    }

    @Override
    protected void drawTriangle() {
        if (useRandomColor) {
            color = new Color((int) (Math.random() *0x1000000));
        } else {
            color = Color.BLACK;
        }
        super.drawTriangle();
    }

    //Main Method to start the SierpinskiTriangle class
    public static void main(String[] args) {
        new SierpinskiTriangle();
    }
}

import java.awt.*;

//Brick class for a wall segment
public class Brick extends GameItem {
    private final AudColor color;

    //Constructor for the brick
    public Brick(int x, int y) {
        super(x, y);
        this.color = AudColor.GRAY;
    }

    //Override the paint method to draw the brick on the game screen
    @Override
    public void paint(AudGraphics g) {
        g.setColor(color);
        int xPixel = getPosition().getX() * SnakeGame.SQUARE_SIZE;
        int yPixel = getPosition().getY() * SnakeGame.SQUARE_SIZE;
        g.fillRect(xPixel, yPixel, SnakeGame.SQUARE_SIZE, SnakeGame.SQUARE_SIZE);
    }
}

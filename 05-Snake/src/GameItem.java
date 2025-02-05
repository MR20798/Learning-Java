import java.awt.*;

public abstract class GameItem {
    private final Point position; //Position GameItem

    //Constructor
    public GameItem(int x, int y) {
        this.position = new Point(x, y);
    }

    //Getter for Position
    public Point getPosition() {
        return position;
    }

    //Setter for Position
    public void setPosition(int x, int y) {
        this.position.setCoordinates(x, y);
    }

    //Method for Painting
    public abstract void paint(AudGraphics g);
}

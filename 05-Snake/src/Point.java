public class Point {
    //Attributes to store the x and y coordinates of the poinr
    private int x;
    private int y;

    //Constructors for x and y
    public Point(int x, int y) {
        this.x = x;
        this.y = y;
    }

    //Getter for x
    public int getX() {
        return x;
    }

    //Getter for y
    public int getY() {
        return y;
    }

    //Method to update the x and y coordinates of the point
    public void setCoordinates(int x, int y) {
        this.x = x;
        this.y = y;
    }
}

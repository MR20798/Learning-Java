public class Snake extends GameItem {
    //Array of Points representing the segments of the snake
    private Point[] points; //Array for the snake
    private final AudColor color;
    private Direction nextDirection;
    private Direction lastDirection;
    public static final int GROW_AMOUNT = 3;

    //Possible directions of snake movement
    public enum Direction {
        RIGHT, LEFT, UP, DOWN
    }

    //Constructor to initialize the snake with a specific length and starting position
    public Snake(int length, int x, int y) {
        super(x, y);
        if (length <= 0) {
            throw new IllegalArgumentException("length must be greater than 0");
        }
        //Initialize the points array to represent the snake segments
        points = new Point[length];
        points[0] = new Point(x, y);

        //Initialize the body segments of the snake
        for (int i = 1; i < length; i++) {
            points[i] = new Point(x - i, y);
        }
        color = AudColor.GREEN;

        //Initialize directions
        nextDirection = Direction.RIGHT;
        lastDirection = Direction.RIGHT;
    }

    //Moves the snake in the current direction by updating the positions of all segments
    public void step() {
        int newX = points[0].getX();
        int newY = points[0].getY();

        switch (nextDirection) {
            case RIGHT:
                newX++;
                break;

            case LEFT:
                newX--;
                break;

            case UP:
                newY--;
                break;

            case DOWN:
                newY++;
                break;

        }

        System.arraycopy(points, 0, points, 1, points.length - 1);

        points[0] = new Point(newX, newY);

        lastDirection = nextDirection;
    }

    //Getter for the next direction
    public Direction getNextDirection() {
        return nextDirection;
    }

    //Setter to change the next movement direction
    public void setNextDirection(Direction nextDirection) {

        if ((lastDirection == Direction.RIGHT && nextDirection == Direction.LEFT) ||
                (lastDirection == Direction.LEFT && nextDirection == Direction.RIGHT) ||
                (lastDirection == Direction.UP && nextDirection == Direction.DOWN) ||
                (lastDirection == Direction.DOWN && nextDirection == Direction.UP)) {
            return;


        }
        this.nextDirection = nextDirection;
    }

    //Getter for the last direction
    public Direction getLastDirection() {
        return lastDirection;
    }

    //Sets the last movement direction
    public void setLastDirection(Direction lastDirection) {
        this.lastDirection = lastDirection;
    }

    //Draws the snake on the game window
    @Override
    public void paint(AudGraphics g) {
        g.setColor(color);
        for (Point segment : points) {
            if (segment != null) {
                int xPixel = segment.getX() * SnakeGame.SQUARE_SIZE;
                int yPixel = segment.getY() * SnakeGame.SQUARE_SIZE;
                g.fillRect(xPixel, yPixel, SnakeGame.SQUARE_SIZE, SnakeGame.SQUARE_SIZE);
            }
        }
    }

    //Alternate constructor that initializes the snake with length of 5
    public Snake(int x, int y) {
        this(5, x, y);
    }

    //Returns the array of points representing the snake
    public Point[] getPoints() {
        return points;
    }

    //Checks if the snake collides with specific coordinates
    public boolean collidesWith(int x, int y) {
        for (Point segment : points) {
            if (segment != null && segment.getX() == x && segment.getY() == y) {
                return true;
            }
        }
        return false;
    }


    //Checks if the snake collides with a GameItem object
    public boolean collidesWith(GameItem item) {
        return collidesWith(item.getPosition().getX(), item.getPosition().getY());
    }

    //Checks if the snake collides with itself
    public boolean collidesWithSelf() {
        Point head = points[0];
        for (int i = 1; i < points.length; i++) {
            if (points[i] != null && points[i].getX() == head.getX() && points[i].getY() == head.getY()) {
                return true;
            }
        }
        return false;
    }

    //Grows the snake by a specified amount
    public void grow(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("amount must be greater than 0");
        }

        int currentLength = points.length;

        Point[] newPoints = new Point[currentLength + amount];

        System.arraycopy(points, 0, newPoints, 0, currentLength);

        for (int i = currentLength; i < newPoints.length; i++) {
            newPoints[i] = null;
        }
        points = newPoints;
    }
}




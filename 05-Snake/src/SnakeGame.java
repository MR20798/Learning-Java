import java.util.List;
import java.util.ArrayList;
import java.util.Random;
import java.awt.event.KeyEvent;

public class SnakeGame extends AudGameWindow {
    //Game constants and attributes
    private int score;
    public static final int SQUARE_SIZE = 16;
    private final int width;
    private final int height;
    private final Snake snake;
    public static final int STEP_TIME = 100;
    private long lastSnakeUpdate;
    private final List<Brick> bricks;
    private final Brick[] wall;
    private Apple apple;

    //Constructor initializes the game and its components
    public SnakeGame() {
        super();

        //Calculate game field dimensions
        this.width = getGameAreaWidth() / SQUARE_SIZE;
        this.height = getGameAreaHeight() / SQUARE_SIZE;
        score = 0;

        //Set starting position of the snake at the center
        int startX = width / 2;
        int startY = height / 2;
        this.snake = new Snake(startX, startY);
        setTitle("AuD-Snake - Score: " + score);
        this.lastSnakeUpdate = System.currentTimeMillis();
        this.bricks = new ArrayList<>();

        //Initialize the boundary wall around the game field
        int wallSize = (2 * width) + (2 * (height - 2));
        wall = new Brick[wallSize];

        int index = 0;

        //Add bricks for the top and bottom edges
        for (int x = 0; x < width; x++) {
            wall[index++] = new Brick(x, 0);
            wall[index++] = new Brick(x, height - 1);
        }

        //Add bricks for the left and right edges
        for (int y = 1; y < height - 1; y++) {
            wall[index++] = new Brick(0, y);
            wall[index++] = new Brick(width - 1, y);
        }

        //Place first apple randomly
        createNewApple();
    }

    //Method to update Score and window title
    public void updateScore(int points) {
        score += points;
        setTitle("AuD-Snake - Score: " + score);
    }

    //Main Method to start the game
    public static void main(String[] args) {
        SnakeGame game = new SnakeGame();
        game.start();
    }

    //User input to control the snake's direction
    @Override
    public void handleInput(int keyCode) {
        switch (keyCode) {
            case KeyEvent.VK_UP:
                if (snake.getLastDirection() != Snake.Direction.DOWN) {
                    snake.setNextDirection(Snake.Direction.UP);
                }
                break;

            case KeyEvent.VK_DOWN:
                if (snake.getLastDirection() != Snake.Direction.UP) {
                    snake.setNextDirection(Snake.Direction.DOWN);
                }
                break;

            case KeyEvent.VK_LEFT:
                if (snake.getLastDirection() != Snake.Direction.RIGHT) {
                    snake.setNextDirection(Snake.Direction.LEFT);
                }
                break;

            case KeyEvent.VK_RIGHT:
                if (snake.getLastDirection() != Snake.Direction.LEFT) {
                    snake.setNextDirection(Snake.Direction.RIGHT);
                }
                break;

            default:
                break;
        }
    }

    //Updates the game at regular time intervals
    @Override
    public void updateGame(long time) {
        long currentTime = time;
        while (currentTime - lastSnakeUpdate >= STEP_TIME) {
            snake.step();
            lastSnakeUpdate += STEP_TIME;
            checkCollisions();

            Point head = snake.getPoints()[0];
            int headX = head.getX();
            int headY = head.getY();

            Point[] body = snake.getPoints();
        }
    }

    //Draws the game field and all game objects
    @Override
    public void paintGame(AudGraphics g) {
        g.setColor(AudColor.BLACK); //Background Color

        g.fillRect(0, 0, getGameAreaWidth(), getGameAreaHeight());

        //Draw Snake
        if (snake != null) {
            snake.paint(g);
        }

        //Draw Apple
        if (apple != null) {
            apple.paint(g);
        }

        //Draw the boundary wall
        for (Brick brick : wall) {
            brick.paint(g);
        }


    }

    //Method to create a new apple
    private void createNewApple() {
        Random random = new Random();
        int newX, newY;

        //Ensure the new apple doesn't collide with the snake or wall
        do {
            newX = random.nextInt(width);
            newY = random.nextInt(height);
        } while (snake.collidesWith(newX, newY) || isPositionInWall(newX, newY));

        apple = new Apple(newX, newY);
    }

    //Checks if a position is within boundary wall
    private boolean isPositionInWall(int x, int y) {
        for (Brick brick : wall) {
            if (brick.getPosition().getX() == x && brick.getPosition().getY() == y) {
                return true;
            }
        }
        return false;
    }


    //Check Collisions between the snake and other game objects
    private void checkCollisions() {
        Point head = snake.getPoints()[0];
        int headX = head.getX();
        int headY = head.getY();

        //Collision with wall
        for (Brick brick : wall) {
            if (snake.collidesWith(brick)) {
                stop();
                showDialog("You died!" + " Score:" + score);
                return;
            }
        }

        //Collision with border of Game
        if (headX < 0 || headX >= width || headY < 0 || headY >= height) {
            stop();
            showDialog("You died!" + " Score:" + score);
            return;
        }

        //Collision with Snake
        if (snake.collidesWithSelf()) {
            stop();
            showDialog("You died!" + " Score:" + score);
            return;
        }


        //Collision with apple
        if (snake.collidesWith(apple)) {
            updateScore(apple.getValue());
            snake.grow(5);
            createNewApple();
        }

    }
}

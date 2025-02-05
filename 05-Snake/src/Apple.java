public class Apple extends GameItem {
    private static int appleCount = 0;
    private final int VALUE;
    private final AudColor color; //Color Apple

    //Constructor
    public Apple(int x, int y) {
        super(x, y);
        appleCount++;
        this.VALUE = appleCount;
        this.color = AudColor.RED;
    }

    //Getter Method for Value
    public int getValue() {
        return VALUE;
    }

    //Paints the apple as a red oval on the game board
    @Override
    public void paint(AudGraphics g) {
        g.setColor(AudColor.RED);
        int xPixel = getPosition().getX() * SnakeGame.SQUARE_SIZE;
        int yPixel = getPosition().getY() * SnakeGame.SQUARE_SIZE;
        g.fillOval(xPixel, yPixel, SnakeGame.SQUARE_SIZE, SnakeGame.SQUARE_SIZE);
    }
}

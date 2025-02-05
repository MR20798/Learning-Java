// =================================
// DO NOT MODIFY THIS CLASS
// =================================
// This class is necessary as we can't allow access to AWT directly
// When testing submissions on EST this class will be replaced by a class that does not need AWT
public class AudGraphics {
	private java.awt.Graphics2D g2d;
	
    public AudGraphics(java.awt.Graphics2D g2d) {
    	this.g2d = g2d;
    }

    public void draw3DRect(int x, int y, int width, int height,
                           boolean raised) {
    	this.g2d.draw3DRect(x, y, width, height, raised);
    }

    public void fill3DRect(int x, int y, int width, int height,
                           boolean raised) {
        this.g2d.fill3DRect(x, y, width, height, raised);
    }

    public void drawLine(int x1, int y1, int x2, int y2) {
    	this.g2d.drawLine(x1, y1, x2, y2);
    }


    public void fillRect(int x, int y, int width, int height) {
    	this.g2d.fillRect(x, y, width, height);
    }

    public void drawRect(int x, int y, int width, int height) {
        this.g2d.drawRect(x, y, width, height);
    }

    public void clearRect(int x, int y, int width, int height) {
    	this.g2d.fillRect(x, y, width, height);
    }

    public void drawRoundRect(int x, int y, int width, int height,
                                       int arcWidth, int arcHeight) {
    	this.g2d.drawRoundRect(x, y, width, height, arcWidth, arcHeight);
    }

    public void fillRoundRect(int x, int y, int width, int height,
                                       int arcWidth, int arcHeight) {
    	this.g2d.fillRoundRect(x, y, width, height, arcWidth, arcHeight);
    }

    public void drawOval(int x, int y, int width, int height) {
    	this.g2d.drawOval(x, y, width, height);
    }

    public void fillOval(int x, int y, int width, int height) {
    	this.g2d.fillOval(x, y, width, height);
    }

    public void drawArc(int x, int y, int width, int height,
                                 int startAngle, int arcAngle) {
    	this.g2d.drawArc(x, y, width, height, startAngle, arcAngle);
    }

    public void fillArc(int x, int y, int width, int height,
                                 int startAngle, int arcAngle) {
    	this.g2d.fillArc(x, y, width, height, startAngle, arcAngle);
    }

    public void drawPolyline(int xPoints[], int yPoints[],
                                      int nPoints) {
    	this.g2d.drawPolyline(xPoints, yPoints, nPoints);
    }

    public void drawPolygon(int xPoints[], int yPoints[],
                                     int nPoints) {
    	this.g2d.drawPolygon(xPoints, yPoints, nPoints);
    }

    public void fillPolygon(int xPoints[], int yPoints[],
                                     int nPoints) {
    	this.g2d.fillPolygon(xPoints, yPoints, nPoints);
    }

    public void drawString(String str, int x, int y) {
    	this.g2d.drawString(str, x, y);
    }

    public AudColor getColor() {
    	return new AudColor(this.g2d.getColor().getRGB());
    }

    public void setColor(AudColor c) {
    	this.g2d.setColor(new java.awt.Color(c.getRGB()));
    }
    
    public void setBackground(AudColor color) {
    	this.g2d.setBackground(new java.awt.Color(color.getRGB()));
    }

    public AudColor getBackground() {
    	return new AudColor(this.g2d.getBackground().getRGB());
    }

//    public void setStroke(Stroke s) {
//    	this.g2d.setStroke(s);
//    }
//    
//    public Stroke getStroke() {
//    	return this.g2d.getStroke();
//    }
}

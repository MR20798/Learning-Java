import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;

public interface BSTInterface {

	/**
	 * Clears the search tree.
	 */
	public void clear();

	/**
	 * Checks if this value already exists in the search tree.</br>
	 * <i>Hint</i>: The complexity of this method linearly increases with the tree
	 * height.
	 * 
	 * @param value
	 *            Value to check
	 * @return true if value already exists in the tree, false otherwise
	 */
	public boolean exists(int value);

	/**
	 * Inserts the value into the search tree if it does not already exist.</br>
	 * <i>Hint</i>: The complexity of this method linearly increases with the tree
	 * height.
	 * 
	 * @param value
	 *            Value to check
	 * @throws ElementExistsException,
	 *             if the value already exists in the search tree
	 * 
	 */
	public void insert(int value) throws ElementExistsException;

	/**
	 * Removes the value from the search tree.</br>
	 * <i>Hint</i>: The complexity of this method linearly increases with the tree
	 * height.
	 * 
	 * @param value
	 *            Value to be removed
	 * @throws NoSuchElementException,
	 *             if the value doesn't exist in the search tree
	 */
	public void remove(int value) throws NoSuchElementException;

	/**
	 * Performs an <i>in-order</i> traversal through all elements of the search tree and returns a
	 * sorted list of all elements in ascending order.</br>
	 * 
	 * @return A sorted list of all elements of the tree in ascending order.
	 */
	public List<Integer> inOrderList();
	
	/**
	 * Performs a <i>pre-order</i> traversal through all elements of the search tree.</br>
	 * 
	 * @return A list of all elements of the tree (by pre-order traversal).
	 */
	public List<Integer> preOrderList();
	
	/**
	 * Performs a <i>post-order</i> traversal through all elements of the search tree.</br>
	 * 
	 * @return A list of all elements of the tree (by post-order traversal).
	 */
	public List<Integer> postOrderList();

}

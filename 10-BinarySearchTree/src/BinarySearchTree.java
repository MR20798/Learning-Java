import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

public class BinarySearchTree {

    private TreeNode root;

    // Innere Klasse TreeNode
    private class TreeNode {
        int value;
        TreeNode left, right, parent;

        // Konstruktor
        public TreeNode(int value) {
            this.value = value;
            this.left = null;
            this.right = null;
            this.parent = null;
        }
    }

    public void clear(){
        root = null;
    }

    // Rekursive Methode insert
    public void insert(int value) throws ElementExistsException {
        root = insertRecursive(root, null, value);
    }

    private TreeNode insertRecursive(TreeNode node, TreeNode parent, int value) throws ElementExistsException {
        if (node == null) {
            TreeNode newNode = new TreeNode(value);
            newNode.parent = parent;
            return newNode;
        }
        if (value == node.value) {
            throw new ElementExistsException("Element " + value + " existiert bereits im Baum.");
        } else if (value < node.value) {
            node.left = insertRecursive(node.left, node, value);
        } else {
            node.right = insertRecursive(node.right, node, value);
        }
        return node;
    }

    // Rekursive Methode exists
    public boolean exists(int value) {
        return existsRecursive(root, value);
    }

    private boolean existsRecursive(TreeNode node, int value) {
        if (node == null) {
            return false;
        }
        if (value == node.value) {
            return true;
        } else if (value < node.value) {
            return existsRecursive(node.left, value);
        } else {
            return existsRecursive(node.right, value);
        }
    }


    public void remove(int value) {
        TreeNode node = find(root, value);
        if (node == null) {
            throw new NoSuchElementException("Element " + value + " existiert nicht im Baum.");
        }
        remove(node);
    }

    private void remove(TreeNode node) {
        int children = numChildren(node);

        if (children == 0) {
            replaceInParent(node, null);
        } else if (children == 1) {
            TreeNode child = (node.left != null) ? node.left : node.right;
            replaceInParent(node, child);
        } else {
            TreeNode successor = findMin(node.right);
            node.value = successor.value;
            remove(successor);
        }
    }


    private int numChildren(TreeNode node) {
        int count = 0;
        if (node.left != null) count++;
        if (node.right != null) count++;
        return count;
    }


    private TreeNode findMin(TreeNode node) {
        while (node.left != null) {
            node = node.left;
        }
        return node;
    }


    private TreeNode find(TreeNode node, int value) {
        if (node == null || node.value == value) {
            return node;
        }
        if (value < node.value) {
            return find(node.left, value);
        } else {
            return find(node.right, value);
        }
    }


    private void replaceInParent(TreeNode node, TreeNode newNode) {
        if (node.parent == null) {
            root = newNode;
        } else if (node == node.parent.left) {
            node.parent.left = newNode;
        } else {
            node.parent.right = newNode;
        }
        if (newNode != null) {
            newNode.parent = node.parent;
        }
    }


    public List<Integer> inOrderList() {
        List<Integer> result = new ArrayList<>();
        inOrderRecursive(root, result);
        return result;
    }

    private void inOrderRecursive(TreeNode node, List<Integer> result) {
        if (node != null) {
            inOrderRecursive(node.left, result);
            result.add(node.value);
            inOrderRecursive(node.right, result);
        }
    }


    public List<Integer> preOrderList() {
        List<Integer> result = new ArrayList<>();
        preOrderRecursive(root, result);
        return result;
    }

    private void preOrderRecursive(TreeNode node, List<Integer> result) {
        if (node != null) {
            result.add(node.value);
            preOrderRecursive(node.left, result);
            preOrderRecursive(node.right, result);
        }
    }


    public List<Integer> postOrderList() {
        List<Integer> result = new ArrayList<>();
        postOrderRecursive(root, result);
        return result;
    }

    private void postOrderRecursive(TreeNode node, List<Integer> result) {
        if (node != null) {
            postOrderRecursive(node.left, result);
            postOrderRecursive(node.right, result);
            result.add(node.value);
        }
    }

    public static void main(String[] args) {
        try {
            BinarySearchTree bst = new BinarySearchTree();
            bst.insert(13);
            bst.insert(7);
            bst.insert(14);
            bst.insert(6);
            bst.insert(8);
            bst.insert(15);
            bst.insert(16);

            System.out.println("Inorder: " + bst.inOrderList());
            System.out.println("Preorder: " + bst.preOrderList());
            System.out.println("Postorder: " + bst.postOrderList());


        } catch (ElementExistsException e) {
            e.printStackTrace();
        }
    }
}



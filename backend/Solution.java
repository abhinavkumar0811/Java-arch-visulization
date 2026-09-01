import java.util.*; import java.io.*; import java.math.*; import java.time.*;
import java.util.*;

class Solution {

    static class TreeNode {
        int val;
        TreeNode left;
        TreeNode right;

        TreeNode(int val) {
            this.val = val;
        }
    }

    public void dfs(TreeNode root, List<Integer> result) {

        if (root == null) {
            return;
        }

        // Visit current node
        result.add(root.val);

        // Traverse left subtree
        dfs(root.left, result);

        // Traverse right subtree
        dfs(root.right, result);
    }

    public static void main(String[] args) {

        Solution obj = new Solution();

        /*
                  1
                /   \
               2     3
              / \   / \
             4   5 6   7
                /
               8
        */

        TreeNode root = new TreeNode(1);

        root.left = new TreeNode(2);
        root.right = new TreeNode(3);

        root.left.left = new TreeNode(4);
        root.left.right = new TreeNode(5);

        root.right.left = new TreeNode(6);
        root.right.right = new TreeNode(7);

        root.left.right.left = new TreeNode(8);

        List<Integer> result = new ArrayList<>();

        obj.dfs(root, result);

        System.out.println(result);
    }
}
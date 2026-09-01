import java.util.*; import java.io.*; import java.math.*; import java.time.*;
class Solution {

    public int numIslands(char[][] grid) {

        int count = 0;

        for (int i = 0; i < grid.length; i++) {

            for (int j = 0; j < grid[0].length; j++) {

                if (grid[i][j] == '1') {

                    count++;

                    dfs(grid, i, j);
                }
            }
        }

        return count;
    }

    private void dfs(char[][] grid, int row, int col) {

        // Boundary check
        if (row < 0 ||
            row >= grid.length ||
            col < 0 ||
            col >= grid[0].length ||
            grid[row][col] == '0') {

            return;
        }

        // Mark current land as visited
        grid[row][col] = '0';

        // Down
        dfs(grid, row + 1, col);

        // Up
        dfs(grid, row - 1, col);

        // Right
        dfs(grid, row, col + 1);

        // Left
        dfs(grid, row, col - 1);
    }

    public static void main(String[] args) {

        Solution obj = new Solution();

        char[][] grid = {
            {'1', '1', '0', '0', '0'},
            {'1', '1', '0', '1', '1'},
            {'0', '0', '0', '1', '1'},
            {'0', '0', '0', '0', '0'},
            {'1', '0', '1', '1', '1'}
        };

        int result = obj.numIslands(grid);

        System.out.println(result);
    }
}
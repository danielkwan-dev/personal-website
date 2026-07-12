class Solution(object):
    def findUnsortedSubarray(self, nums):
        """
        :type nums: List[int]
        :rtype: int
        """

        right = len(nums) - 1
        max_num = -float("inf")
        right_ptr = -1
        min_num = float("inf")
        left_ptr = -1

        for i in range(len(nums)):
            if nums[i] >= max_num:
                max_num = nums[i]
            elif nums[i] <= max_num:
                right_ptr = i
            
            if nums[right] <= min_num:
                min_num = nums[right]
            elif nums[right] >= min_num:
                left_ptr = right
            
            right -= 1
        
        if right_ptr == -1:
            return 0
        return right_ptr - left_ptr + 1

        
        




        
import { useQuery } from '@tanstack/react-query';
import userService from "../services/userSevice.ts";


export function useAuth(initData: string, orderId: number | null = null) {

    return useQuery({
        queryKey: ['auth', initData, orderId],
        queryFn: () => {
            if (!initData) {
                throw new Error('No initData');
            }
            return userService.authentication({
                initData: initData,
                orderId: orderId
            });
        },
        enabled: !!initData,
        retry: false,
    });
}
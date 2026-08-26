/*;=============================================   
; Author           :  Global Software's    
; Create date      :  17/08/2022    
; Create By        :  ASLAM  
; Description      :  DC GOODS VALUE QUERY
; Change Person    :  ASLAM
; Last Change Date :  27/12/2022 10.02 AM 
; =============================================  */  
CREATE PROCEDURE SP_FabDelivery_stkValue (@ID int)
AS
Update tmp set tmp.StkRate_DC = isnull(st.Cumbillrate,0) 
                             From Trs_del2 tmp INNER JOIN StockTable B ON tmp.StockID= B.StockID 
							 INNER JOIN StockRAtePost st (nolock) 
                             on tmp.ordid=st.ordid 
                             and B.Dept=st.deptid 
                             and  isnull(B.cntid,0)=isnull(st.cntid,0) 
                             and  isnull(B.fabid,0)=isnull(st.fabid,0) 
                             and  isnull(B.colid,0)=isnull(st.colid,0) 
                             and	 isnull(B.PRINT_DESIGNID,0) = 	ISNULL(st.designid,0) 
                             where(isnull(st.Cumbillrate, 0) <> 0) And tmp.ID = @ID


Update tmp set tmp.StkRate_DC = st.budrate 
                             from Trs_del2 tmp INNER JOIN StockTable B ON tmp.StockID= B.StockID  
							 inner join StockRAtePost st (nolock) 
                             on tmp.ordid=st.ordid 
                             and B.dept=st.deptid  
                             and  isnull(B.cntid,0)=isnull(st.cntid,0) 
                             and  isnull(B.fabid,0)=isnull(st.fabid,0) 
                             and  isnull(B.colid,0)=isnull(st.colid,0)  
                             and	 isnull(B.print_designid,0) = 	ISNULL(st.designid,0) 
                             where(isnull(st.Cumbillrate, 0) = 0)  And tmp.ID = @ID


Update tmp set tmp.StkRate_DC = st.budrate 
                            from Trs_del1 a inner join Trs_del2  tmp on a.id = tmp.id INNER JOIN StockTable B ON tmp.StockID= B.StockID  
							INNER JOIN StockRAtePost st (nolock) 
                            on tmp.ordid=st.ordid 
                            and B.dept=st.deptid  
                            and  isnull(B.cntid,0)=isnull(st.cntid,0) 
                            and  isnull(B.fabid,0)=isnull(st.fabid,0) 
                            and  isnull(B.colid,0)=isnull(st.colid,0)  
                            and	 isnull(B.PRINT_DESIGNID,0) = 	ISNULL(st.designid,0) 
                            where A.prs_dept In (3,15,4,8) and tmp.id = @ID

/*;=============================================   
; Author           :  Global Software's    
; Create date      :  14/02/2022
; Create By        :  ASLAM  
; Description      :  Ready To Cut  
; Change Person    :  ASLAM
; Last Change Date :  18/07/2022 11.25 AM 
; =============================================  */   
CREATE PROC [SP_RtoCut](@Ordid int) AS 
BEGIN
DECLARE @StyleNo Varchar(20)='',@DeptID int,@FabId int ,@ColId int,@CntId int , @DesignId int, @FinDiaId int,@FinGSM numeric(18,2) , @LL varchar (15),@ReqKgs numeric (18,3),@ReqMtr numeric (18,3),@Cnt int 

SET @DeptID =-7
SET @Styleno = ''

DECLARE Cursor_2_Main CURSOR FOR 	
SELECT  DISTINCT FabId,ColId,CntId,DesignId,FinDiaId,FinGSM,LL,isNull(Sum(ReqKgs),0) as ReqKgs,isNull(Sum(ReqMtr),0) as ReqMtr  FROM Pro_ReqKnitt WHERE Ordid = @ORdid and DeptID = 11  GROUP BY FabId,ColId,CntId,DesignId,FinDiaId,FinGSM,LL 

OPEN Cursor_2_Main 		 		
FETCH NEXT FROM Cursor_2_Main INTO @FabId,@ColId,@CntId,@DesignId,@FinDiaId,@FinGSM,@LL,@ReqKgs,@ReqMtr
WHILE @@FETCH_STATUS = 0 		
BEGIN   
	
SELECT @Cnt = COUNT(Ordid) from ST_ProgBalance_Fabric WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId= -7 AND FabId= @FabId AND  ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL  

	IF @Cnt >0  
	begin  
		SELECT @REQKGS = 0  
		SELECT @ReqMtr = 0 
		SELECT @ReqKgs = isNull(sum(reqkgs) ,0) from Pro_ReqKnitt WHERE OrdId=@OrdId and DeptId= 11 AND FabId= @FabId AND  ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL   
		SELECT @ReqMtr = isNull(sum(ReqMtr) ,0) from Pro_ReqKnitt WHERE OrdId=@OrdId and DeptId= 11 AND FabId= @FabId AND  ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL  
	
		Update ST_ProgBalance_Fabric  SET Reqkgs= @ReqKgs,ReqMtr=@ReqMtr WHERE OrdId=@OrdId and StyleNo=@StyleNo and DeptId= @DeptId AND FabId= @FabId AND  ColId = @ColId AND CntId = @CntId AND DesignId = @DesignId AND FinDiaId = @FinDiaId AND FinGSM = @FinGSM AND LL = @LL  
	end  
	else  
	BEGIN  
	insert into ST_ProgBalance_Fabric (OrdId ,StyleNo ,DeptId ,FabId ,ColId ,CntId ,DesignId ,FindiaId ,FinGsm ,LL ,ReqKgs,ReqMtr)  Values (@OrdId,@StyleNo,@DeptId,@FabId,@ColId,@CntId,@DesignId,@FinDiaId,@FinGSM,@LL,@ReqKgs,@ReqMtr) 
	END


	FETCH NEXT FROM Cursor_2_Main INTO @FabId,@ColId,@CntId,@DesignId,@FinDiaId,@FinGSM,@LL,@ReqKgs,@ReqMtr
END
CLOSE Cursor_2_Main
DEALLOCATE Cursor_2_Main

END  